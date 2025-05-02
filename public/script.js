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
const recordingTimer = document.getElementById("recordingTimer");
const retryButton = document.getElementById("retryButton");

let mediaRecorder;
let mediaStream;
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

  // إعادة ضبط جميع حقول الإدخال وعناصر واجهة المستخدم
  extraInput.style.display = "none";
  extraInput.value = "";
  submitBtn.style.display = "none";
  recordButton.style.display = "none";
  stopButton.style.display = "none";
  audioPreview.style.display = "none";
  audioPreview.src = "";
  recordingTimer.style.display = "none";
  retryButton.style.display = "none";

  // مسح موارد الصوت
  audioBlob = null;

  // إيقاف الميكروفون إذا كان نشطًا
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }
}

function handleAnswer(answer, showExtraInput, allowRecording) {
  // إذا كان السؤال يتطلب إدخال نص إضافي
  if (showExtraInput) {
    // إظهار حقل الإدخال النصي
    extraInput.style.display = "flex";
    extraInput.style.width = "80%";
    extraInput.style.padding = "10px";
    extraInput.style.marginTop = "10px";
    extraInput.style.borderRadius = "12px";
    extraInput.style.fontFamily = "inherit";
    extraInput.style.border = "2px solid #f8a7b3";
    extraInput.style.justifyContent = "center";
    extraInput.style.alignItems = "center";
    extraInput.style.minHeight = "50px";

    // إظهار زر الإرسال
    submitBtn.style.display = "block";

    // تعيين وظيفة زر الإرسال
    submitBtn.onclick = function() {
      // التحقق من أن المستخدم أدخل نصًا
      if (extraInput.value.trim() === "") {
        alert("الرجاء إدخال نص قبل الإرسال");
        return;
      }

      // إرسال الإجابة مع النص الإضافي
      submitAnswer(answer + " - " + extraInput.value, null);
    };

    // عدم إرسال الإجابة تلقائيًا، ننتظر النقر على زر الإرسال
    return;
  } else {
    // إذا كان السؤال لا يتطلب إدخال نص إضافي، إرسال الإجابة مباشرة
    submitAnswer(answer, null);
  }

  // زر التسجيل يظهر فقط لو الإجابة "آه عاوزة" في السؤال الثالث
  if (allowRecording && answer === "آه عاوزة") {
    recordButton.style.display = "block";
    recordButton.onclick = startRecording;

    // عدم إرسال الإجابة تلقائيًا، ننتظر التسجيل
    return;
  }
}

// تم نقل تعريفات recordingTimer و retryButton إلى بداية الملف

function startRecording() {
  console.log("Starting audio recording...");

  // طلب الإذن باستخدام الميكروفون بإعدادات بسيطة
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      console.log("Microphone access granted");
      mediaStream = stream;

      // إنشاء مسجل الصوت
      try {
        // تحديد تنسيقات الصوت المدعومة
        const mimeTypes = [
          'audio/webm',
          'audio/webm;codecs=opus',
          'audio/mp4',
          'audio/ogg',
          ''  // تنسيق افتراضي
        ];

        // البحث عن تنسيق مدعوم
        let selectedMimeType = '';
        for (let type of mimeTypes) {
          if (type && MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
          }
        }

        console.log("Using MIME type:", selectedMimeType || "browser default");

        // إنشاء مسجل الصوت بالتنسيق المدعوم
        const options = selectedMimeType ?
          { mimeType: selectedMimeType, audioBitsPerSecond: 128000 } :
          {};

        mediaRecorder = new MediaRecorder(stream, options);
        console.log("MediaRecorder created with options:", options);
      } catch (e) {
        console.warn('Error creating MediaRecorder:', e);
        console.log('Falling back to default format');
        mediaRecorder = new MediaRecorder(stream);
      }

      const audioChunks = [];

      // إظهار مؤقت التسجيل
      recordingTimer.innerText = "0:00";
      recordingTimer.style.display = "block";

      // تحديث المؤقت كل ثانية
      let startTime = Date.now();
      let timerInterval = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60);
        const seconds = elapsedSeconds % 60;
        recordingTimer.innerText = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
      }, 1000);

      // جمع بيانات الصوت
      mediaRecorder.ondataavailable = event => {
        console.log("Data available event, size:", event.data.size);
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      // معالجة إيقاف التسجيل
      mediaRecorder.onstop = () => {
        console.log("Recording stopped");

        // إيقاف المؤقت
        clearInterval(timerInterval);
        recordingTimer.style.display = "none";

        // إنشاء ملف الصوت
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        console.log("Creating audio blob with MIME type:", mimeType);
        console.log("Audio chunks:", audioChunks.length);

        audioBlob = new Blob(audioChunks, { type: mimeType });
        console.log("Audio blob created, size:", audioBlob.size, "bytes");

        // عرض الصوت للمعاينة
        const audioUrl = URL.createObjectURL(audioBlob);
        audioPreview.src = audioUrl;
        audioPreview.style.display = "block";

        // تحديث واجهة المستخدم
        stopButton.style.display = "none";
        recordButton.style.display = "none";
        retryButton.style.display = "block";
        submitBtn.style.display = "block";

        // تعيين وظيفة زر الإرسال
        submitBtn.onclick = () => {
          console.log("Submit button clicked for audio recording");
          submitAnswer("تسجيل صوتي", audioBlob);
        };

        // إيقاف الميكروفون
        mediaStream.getTracks().forEach(track => track.stop());
      };

      // بدء التسجيل
      console.log("Starting MediaRecorder...");
      mediaRecorder.start(1000); // الحصول على البيانات كل ثانية
      console.log("MediaRecorder state:", mediaRecorder.state);

      // تحديث واجهة المستخدم
      recordButton.style.display = "none";
      stopButton.style.display = "block";
      retryButton.style.display = "none";

      // تعيين وظيفة زر الإيقاف
      stopButton.onclick = () => {
        console.log("Stop button clicked");
        if (mediaRecorder && mediaRecorder.state === "recording") {
          console.log("Stopping MediaRecorder...");
          mediaRecorder.stop();
        }
      };
    })
    .catch(error => {
      console.error("Error accessing microphone:", error);
      alert("لم يتم السماح باستخدام الميكروفون. يرجى السماح للموقع باستخدام الميكروفون من إعدادات المتصفح.");
    });
}

// 🔄 **دالة إعادة التسجيل**
retryButton.onclick = () => {
  console.log("Retry button clicked");

  // مسح الصوت المسجل
  audioBlob = null;
  audioPreview.src = "";
  audioPreview.style.display = "none";

  // إعادة ضبط عناصر واجهة المستخدم
  submitBtn.style.display = "none";
  retryButton.style.display = "none";

  // إيقاف الميكروفون إذا كان نشطًا
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
  }

  // إظهار زر التسجيل مرة أخرى
  recordButton.style.display = "block";

  console.log("Reset recording UI");
};



function submitAnswer(answer, audioBlob) {
  console.log("Submitting answer:", answer, "Audio:", audioBlob ? "Yes" : "No");

  const currentQuestion = questions[currentQuestionIndex];
  const formData = new FormData();
  formData.append("question", currentQuestion.question);
  formData.append("answer", answer);

  if (audioBlob) {
    console.log("Audio blob size:", audioBlob.size, "Type:", audioBlob.type);
    // استخدام الامتداد الصحيح بناءً على نوع الصوت
    const fileExtension = audioBlob.type.includes('webm') ? 'webm' : 'wav';
    formData.append("audio", audioBlob, `recording.${fileExtension}`);
  }

  // إظهار حالة التحميل
  submitBtn.disabled = true;
  submitBtn.innerText = "جاري الإرسال...";

  // طباعة محتويات FormData للتشخيص
  console.log("Form data entries:");
  for (let pair of formData.entries()) {
    console.log(pair[0] + ': ' + (pair[1] instanceof Blob ? 'Blob' : pair[1]));
  }

  fetch('/submit', {
    method: "POST",
    body: formData,
  })
    .then(response => {
      console.log("Server response status:", response.status);

      // تعامل مع أي نوع من الردود
      if (!response.ok) {
        console.error("Server returned error status:", response.status);
        return response.text().then(text => {
          console.error("Error response:", text);
          throw new Error('Network response was not ok: ' + text);
        });
      }

      return response.text();
    })
    .then(data => {
      console.log("Submit success, response:", data);

      // إعادة تعيين زر الإرسال
      submitBtn.disabled = false;
      submitBtn.innerText = "إرسال";

      // الانتقال إلى السؤال التالي أو إظهار رسالة الإكمال
      currentQuestionIndex++;
      if (currentQuestionIndex < questions.length) {
        showQuestion();
      } else {
        // إظهار رسالة الإكمال
        questionElement.innerHTML = "<h1>💌 انا مبسوط لو انتي مبسوطة يا يومنتي</h1> <h1> ❤️بحبك </h1>";
        choicesElement.innerHTML = "";

        // إخفاء جميع عناصر واجهة المستخدم
        extraInput.style.display = "none";
        submitBtn.style.display = "none";
        recordButton.style.display = "none";
        stopButton.style.display = "none";
        audioPreview.style.display = "none";
        retryButton.style.display = "none";
      }
    })
    .catch(error => {
      console.error("Error during submission:", error);

      // إعادة تعيين زر الإرسال
      submitBtn.disabled = false;
      submitBtn.innerText = "إرسال";

      // إظهار رسالة خطأ للمستخدم
      alert("حدث خطأ أثناء إرسال الإجابة. يرجى المحاولة مرة أخرى.");
    });
}

document.addEventListener("DOMContentLoaded", function () {
  showQuestion();
});
