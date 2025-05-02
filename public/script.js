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

const recordingTimer = document.getElementById("recordingTimer");
const retryButton = document.getElementById("retryButton");

function startRecording() {
  // طلب الإذن باستخدام الميكروفون بإعدادات بسيطة
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      mediaStream = stream;

      // إنشاء مسجل الصوت
      try {
        // محاولة استخدام تنسيق أفضل للصوت
        mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm',
          audioBitsPerSecond: 128000
        });
      } catch (e) {
        console.warn('تنسيق الصوت المحدد غير مدعوم، استخدام التنسيق الافتراضي', e);
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
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      // معالجة إيقاف التسجيل
      mediaRecorder.onstop = () => {
        // إيقاف المؤقت
        clearInterval(timerInterval);
        recordingTimer.style.display = "none";

        // إنشاء ملف الصوت
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        audioBlob = new Blob(audioChunks, { type: mimeType });

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
        submitBtn.onclick = () => submitAnswer("تسجيل صوتي", audioBlob);

        // إيقاف الميكروفون
        mediaStream.getTracks().forEach(track => track.stop());
      };

      // بدء التسجيل
      mediaRecorder.start(1000); // الحصول على البيانات كل ثانية

      // تحديث واجهة المستخدم
      recordButton.style.display = "none";
      stopButton.style.display = "block";
      retryButton.style.display = "none";

      // تعيين وظيفة زر الإيقاف
      stopButton.onclick = () => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
          mediaRecorder.stop();
        }
      };
    })
    .catch(error => {
      console.error("خطأ في التسجيل:", error);
      alert("لم يتم السماح باستخدام الميكروفون. يرجى السماح للموقع باستخدام الميكروفون من إعدادات المتصفح.");
    });
}

// 🔄 **دالة إعادة التسجيل**
retryButton.onclick = () => {
  // مسح الصوت المسجل
  audioBlob = null;
  audioPreview.src = "";
  audioPreview.style.display = "none";

  // إعادة ضبط عناصر واجهة المستخدم
  submitBtn.style.display = "none";
  retryButton.style.display = "none";

  // إظهار زر التسجيل مرة أخرى
  recordButton.style.display = "block";
};



function submitAnswer(answer, audioBlob) {
  const currentQuestion = questions[currentQuestionIndex];
  const formData = new FormData();
  formData.append("question", currentQuestion.question);
  formData.append("answer", answer);

  if (audioBlob) {
    // استخدام الامتداد الصحيح بناءً على نوع الصوت
    const fileExtension = audioBlob.type.includes('webm') ? 'webm' : 'wav';
    formData.append("audio", audioBlob, `recording.${fileExtension}`);
  }

  // إظهار حالة التحميل
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
      console.error("Error:", error);
      alert("حدث خطأ أثناء إرسال الإجابة. يرجى المحاولة مرة أخرى.");

      // إعادة ضبط زر الإرسال
      submitBtn.disabled = false;
      submitBtn.innerText = "إرسال";
    });
}

document.addEventListener("DOMContentLoaded", function () {
  showQuestion();
});
