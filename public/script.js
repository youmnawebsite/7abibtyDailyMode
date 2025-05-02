const questions = [
  {
    question: "مبسوطه يحبيبتي؟",
    choices: [" يعني شويه ", "لا مش مبسوطه ", " مبسوطه يحبيبي"],
  },
  {
    question: "متضايقة من حاجة؟",
    choices: ["آه متضايقة", "لأ، الحمد لله"],
    extraInput: true, // تظهر خانة النص لو اختارت "آه"
  },
  {
    question: "عاوزة تقوليلي حاجة؟",
    choices: ["آه عاوزة", "لأ مش عاوزة"],
    extraInput: true, // تظهر خانة النص لو اختارت "آه"
    allowRecording: true // السماح بتسجيل الصوت لكن فقط لما تختار "آه"
  }
];

let currentQuestionIndex = 0;

const questionElement = document.getElementById("question");
const choicesElement = document.getElementById("choices");
const extraInput = document.getElementById("extraInput");
const submitBtn = document.getElementById("submitBtn");
const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");
const audioPreview = document.getElementById("audioPreview");

let mediaRecorder;
let audioBlob;

function showQuestion() {
  const currentQuestion = questions[currentQuestionIndex];
  questionElement.innerText = currentQuestion.question;

  choicesElement.innerHTML = "";
  currentQuestion.choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.innerText = choice;
    button.addEventListener("click", () => handleAnswer(choice, currentQuestion.extraInput && index === 0, currentQuestion.allowRecording && index === 0));
    choicesElement.appendChild(button);
  });

  // Reset all input fields and UI elements
  extraInput.style.display = "none";
  extraInput.value = "";
  submitBtn.style.display = "none";
  recordButton.style.display = "none";
  stopButton.style.display = "none";
  audioPreview.style.display = "none";
  audioPreview.src = "";

  // Reset audio visualization elements
  waveformElement.style.display = "none";
  volumeMeter.style.display = "none";
  volumeLevel.style.width = "0%";
  recordingTimer.style.display = "none";
  retryButton.style.display = "none";

  // Clean up audio resources
  audioBlob = null;

  // Clean up WaveSurfer if it exists
  if (wavesurfer) {
    wavesurfer.empty();
  }

  // Clean up audio context if it exists
  if (audioContext && audioContext.state !== 'closed') {
    try {
      audioContext.close();
    } catch (e) {
      console.warn('Error closing audio context:', e);
    }
  }
}

function handleAnswer(answer, showExtraInput, allowRecording) {
  if (showExtraInput) {
    extraInput.style.display = "flex";
    extraInput.style.width = "80%"; // إصلاح الستايل
    extraInput.style.padding = "10px";
    extraInput.style.marginTop = "10px";
    extraInput.style.borderRadius = "12px";
    extraInput.style.fontFamily = "inherit";
    extraInput.style.border = "2px solid #f8a7b3";
    extraInput.style.justifyContent = "center";
    extraInput.style.alignItems = "center";
    extraInput.style.minHeight = "50px";
    submitBtn.style.display = "block";

    submitBtn.onclick = () => submitAnswer(answer + " - " + extraInput.value, null);
  }
   else {
    submitAnswer(answer, null);
  }

  // زر التسجيل يظهر فقط لو الإجابة "آه عاوزة" في السؤال الثالث
  if (allowRecording && answer === "آه عاوزة") {
    recordButton.style.display = "block";
    recordButton.onclick = startRecording;
  }
}

let mediaStream;
let audioContext;
let analyser;
let microphone;
let wavesurfer;
let animationId;
const recordingTimer = document.getElementById("recordingTimer");
const volumeMeter = document.getElementById("volume-meter");
const volumeLevel = document.getElementById("volume-level");
const waveformElement = document.getElementById("waveform");

// Initialize WaveSurfer
function initWaveSurfer() {
  // Check if WaveSurfer is already initialized
  if (wavesurfer) {
    wavesurfer.destroy();
  }

  // Create WaveSurfer instance
  wavesurfer = WaveSurfer.create({
    container: waveformElement,
    waveColor: '#ff6f91',
    progressColor: '#ff8fa3',
    cursorColor: 'transparent',
    barWidth: 2,
    barGap: 1,
    height: 60,
    barRadius: 2,
    normalize: true
  });
}

function startRecording() {
  // Request audio with higher quality settings
  navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1
    }
  }).then(stream => {
    mediaStream = stream;

    // Initialize audio context for visualization
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(analyser);

    // Configure analyser
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Initialize MediaRecorder with better audio quality
    const options = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 128000 // 128 kbps for better quality
    };

    // Fall back to default if the browser doesn't support the specified format
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      console.warn('Specified audio format not supported, using default format', e);
      mediaRecorder = new MediaRecorder(stream);
    }

    const audioChunks = [];

    // Show volume meter and waveform
    volumeMeter.style.display = "block";
    waveformElement.style.display = "block";

    // Initialize WaveSurfer
    initWaveSurfer();

    // Start timer
    let startTime = Date.now();
    let elapsedSeconds = 0;

    // Show timer
    recordingTimer.innerText = "0:00";
    recordingTimer.style.display = "block";

    // Update timer every second
    let timerInterval = setInterval(() => {
      elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      let minutes = Math.floor(elapsedSeconds / 60);
      let seconds = elapsedSeconds % 60;
      recordingTimer.innerText = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }, 1000);

    // Update volume meter
    function updateVolumeMeter() {
      analyser.getByteFrequencyData(dataArray);

      // Calculate volume level (average of frequency data)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;

      // Update volume meter (scale to 0-100%)
      const volumePercent = Math.min(100, average * 100 / 256);
      volumeLevel.style.width = volumePercent + '%';

      // Continue animation loop
      animationId = requestAnimationFrame(updateVolumeMeter);
    }

    // Start volume meter animation
    updateVolumeMeter();

    // Collect audio data
    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    // Handle recording stop
    mediaRecorder.onstop = () => {
      // Stop animations and timers
      clearInterval(timerInterval);
      cancelAnimationFrame(animationId);
      recordingTimer.style.display = "none";

      // Create audio blob with better format
      audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });

      // Load audio into WaveSurfer for visualization
      const audioUrl = URL.createObjectURL(audioBlob);
      audioPreview.src = audioUrl;
      audioPreview.style.display = "block";

      // Load audio into WaveSurfer
      wavesurfer.load(audioUrl);

      // Update UI
      volumeMeter.style.display = "none";
      stopButton.style.display = "none";
      recordButton.style.display = "none";
      retryButton.style.display = "block";
      submitBtn.style.display = "block";

      submitBtn.onclick = () => submitAnswer("تسجيل صوتي", audioBlob);

      // Stop microphone
      mediaStream.getTracks().forEach(track => track.stop());

      // Clean up audio context
      if (microphone) {
        microphone.disconnect();
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };

    // Start recording with a timeslice to get data more frequently
    mediaRecorder.start(1000); // Get data every second

    // Update UI
    recordButton.style.display = "none";
    stopButton.style.display = "block";
    retryButton.style.display = "none";

    stopButton.onclick = () => {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
      }
    };
  }).catch(error => {
    console.error("خطأ في التسجيل:", error);
    alert("لم يتم السماح باستخدام الميكروفون. تأكد من إعدادات المتصفح.");
  });
}

// 🔄 **دالة إعادة التسجيل**
retryButton.onclick = () => {
  // Clean up audio resources
  audioBlob = null;
  audioPreview.src = "";
  audioPreview.style.display = "none";

  // Reset waveform display
  waveformElement.style.display = "none";
  if (wavesurfer) {
    wavesurfer.empty();
  }

  // Reset UI elements
  submitBtn.style.display = "none";
  retryButton.style.display = "none";
  volumeMeter.style.display = "none";
  volumeLevel.style.width = "0%";

  // Show record button again
  recordButton.style.display = "block";
};



function submitAnswer(answer, audioBlob) {
  const currentQuestion = questions[currentQuestionIndex];
  const formData = new FormData();
  formData.append("question", currentQuestion.question);
  formData.append("answer", answer);

  if (audioBlob) {
    // Use the correct file extension based on the audio format
    const fileExtension = audioBlob.type.includes('webm') ? 'webm' : 'wav';
    formData.append("audio", audioBlob, `recording.${fileExtension}`);
  }

  // Show loading state
  submitBtn.disabled = true;
  submitBtn.innerText = "جاري الإرسال...";

  fetch('/submit', {
    method: "POST",
    body: formData,
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.text();
    })
    .then(() => {
      // Clean up audio resources
      if (audioContext && audioContext.state !== 'closed') {
        try {
          audioContext.close();
        } catch (e) {
          console.warn('Error closing audio context:', e);
        }
      }

      if (wavesurfer) {
        wavesurfer.empty();
      }

      // Move to next question or show completion message
      currentQuestionIndex++;
      if (currentQuestionIndex < questions.length) {
        showQuestion();
      } else {
        // Show completion message
        questionElement.innerHTML = "<h1>💌 انا مبسوط لو انتي مبسوطة يا يومنتي</h1> <h1> ❤️بحبك </h1>";
        choicesElement.innerHTML = "";

        // Hide all UI elements
        extraInput.style.display = "none";
        submitBtn.style.display = "none";
        recordButton.style.display = "none";
        stopButton.style.display = "none";
        audioPreview.style.display = "none";
        retryButton.style.display = "none";
        waveformElement.style.display = "none";
        volumeMeter.style.display = "none";
        recordingTimer.style.display = "none";
      }
    })
    .catch(error => {
      console.error("Error:", error);
      alert("حدث خطأ أثناء إرسال الإجابة. يرجى المحاولة مرة أخرى.");

      // Reset submit button
      submitBtn.disabled = false;
      submitBtn.innerText = "إرسال";
    });
}

document.addEventListener("DOMContentLoaded", function () {
  showQuestion();
});
