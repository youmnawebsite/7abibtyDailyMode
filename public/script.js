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

  // إخفاء كل الحقول عند تحميل السؤال الجديد
  extraInput.style.display = "none";
  extraInput.value = "";
  submitBtn.style.display = "none";
  recordButton.style.display = "none";
  stopButton.style.display = "none";
  audioPreview.style.display = "none";
  audioPreview.src = "";
  audioBlob = null;
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
const recordingTimer = document.getElementById("recordingTimer");

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaStream = stream;
    mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    let startTime = Date.now();
    let elapsedSeconds = 0;
    
    // إظهار الـ Timer
    recordingTimer.innerText = "0:00";
    recordingTimer.style.display = "block";

    // تحديث العداد كل ثانية
    let timerInterval = setInterval(() => {
      elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      let minutes = Math.floor(elapsedSeconds / 60);
      let seconds = elapsedSeconds % 60;
      recordingTimer.innerText = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    }, 1000);

    mediaRecorder.ondataavailable = event => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      clearInterval(timerInterval); // إيقاف العداد
      recordingTimer.style.display = "none"; // إخفاء العداد عند الانتهاء

      audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      audioPreview.src = URL.createObjectURL(audioBlob);
      audioPreview.style.display = "block";

      stopButton.style.display = "none";
      recordButton.style.display = "none";
      retryButton.style.display = "block"; // 🔄 زر إعادة التسجيل
      submitBtn.style.display = "block"; 

      submitBtn.onclick = () => submitAnswer("تسجيل صوتي", audioBlob);

      // إيقاف الميكروفون
      mediaStream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
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
  audioBlob = null; // حذف التسجيل السابق
  audioPreview.src = ""; // مسح المعاينة
  audioPreview.style.display = "none";
  submitBtn.style.display = "none";
  retryButton.style.display = "none"; // إخفاء زر إعادة التسجيل

  recordButton.style.display = "block"; // إظهار زر التسجيل من جديد
};



function submitAnswer(answer, audioBlob) {
  const currentQuestion = questions[currentQuestionIndex];
  const formData = new FormData();
  formData.append("question", currentQuestion.question);
  formData.append("answer", answer);

  if (audioBlob) {
    formData.append("audio", audioBlob, "recording.wav");
  }

  fetch('/submit', {
    method: "POST",
    body: formData,
  })
    .then(response => response.text())
    .then(() => {
      currentQuestionIndex++;
      if (currentQuestionIndex < questions.length) {
        showQuestion();
      } else {
        questionElement.innerHTML = "<h1>💌 انا مبسوط لو انتي مبسوطة يا يومنتي</h1> <h1> ❤️بحبك </h1>";
        choicesElement.innerHTML = "";
        extraInput.style.display = "none";
        submitBtn.style.display = "none";
        recordButton.style.display = "none";
        stopButton.style.display = "none";
        audioPreview.style.display = "none";
        retryButton.style.display = "none";
      }
    })
    .catch(error => console.error("Error:", error));
}

document.addEventListener("DOMContentLoaded", function () {
  showQuestion();
});
