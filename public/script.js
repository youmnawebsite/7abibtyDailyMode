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
    choices: ["عاوزة أكتب", "عاوزة أسجل صوت", "لأ مش عاوزة"],
    extraInput: true, // تظهر خانة النص لو اختارت "عاوزة أكتب"
    allowRecording: true // السماح بتسجيل الصوت لو اختارت "عاوزة أسجل صوت"
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
  console.log("Showing question index:", currentQuestionIndex);

  const currentQuestion = questions[currentQuestionIndex];
  questionElement.innerText = currentQuestion.question;

  choicesElement.innerHTML = "";

  // التعامل مع السؤال الأخير بشكل خاص
  if (currentQuestionIndex === 2) { // السؤال الثالث (الأخير)
    currentQuestion.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.innerText = choice;

      // تعيين وظيفة مختلفة لكل زر
      if (choice === "عاوزة أكتب") {
        button.addEventListener("click", () => handleAnswer(choice, true, false));
      }
      else if (choice === "عاوزة أسجل صوت") {
        button.addEventListener("click", () => handleAnswer(choice, false, true));
      }
      else {
        button.addEventListener("click", () => handleAnswer(choice, false, false));
      }

      choicesElement.appendChild(button);
    });
  }
  else {
    // التعامل مع الأسئلة الأخرى
    currentQuestion.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.innerText = choice;
      button.addEventListener("click", () => handleAnswer(choice, currentQuestion.extraInput && index === 0, false));
      choicesElement.appendChild(button);
    });
  }

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

  console.log("Question setup complete");
}

function handleAnswer(answer, showExtraInput, allowRecording) {
  console.log("Handle answer:", answer, "showExtraInput:", showExtraInput, "allowRecording:", allowRecording);

  // التعامل مع السؤال الأخير بشكل خاص
  if (currentQuestionIndex === 2) { // السؤال الثالث (الأخير)
    if (answer === "عاوزة أكتب") {
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

      return;
    }
    else if (answer === "عاوزة أسجل صوت") {
      // إظهار زر التسجيل
      recordButton.style.display = "block";
      recordButton.onclick = startRecording;
      return;
    }
    else {
      // إذا اختار "لأ مش عاوزة"، إرسال الإجابة مباشرة
      submitAnswer(answer, null);
      return;
    }
  }

  // التعامل مع الأسئلة الأخرى

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
        // إظهار رسالة الإكمال مع مساحة للملاحظات الخاصة
        questionElement.innerHTML = "<h1>💌 انا مبسوط لو انتي مبسوطة يا يومنتي</h1> <h1> ❤️بحبك </h1>";

        // إضافة مساحة للملاحظات الخاصة
        choicesElement.innerHTML = `
          <div class="notes-container">
            <h3>عشان اي حاجه عاوزه توصليهالي او تطلبيها مني💕</h3>
            <textarea id="personalNotes" placeholder="اكتبي أي حاجة عايزة توصلهالي كلام او طلب او أمنية"></textarea>
            <button id="saveNotesBtn">ابعتي</button>
            <p id="notesSavedMessage" style="display: none; color: #ff6f91; margin-top: 10px;">اتبعتت يروحي ❤️</p>
          </div>
        `;

        // إضافة وظيفة لزر حفظ الملاحظات
        const saveNotesBtn = document.getElementById("saveNotesBtn");
        const personalNotes = document.getElementById("personalNotes");
        const notesSavedMessage = document.getElementById("notesSavedMessage");

        // استرجاع الملاحظات المحفوظة سابقًا
        const savedNotes = localStorage.getItem('personalNotes');
        if (savedNotes) {
          personalNotes.value = savedNotes;
        }

        saveNotesBtn.onclick = () => {
          localStorage.setItem('personalNotes', personalNotes.value);

          // إظهار رسالة التأكيد
          notesSavedMessage.style.display = "block";
          setTimeout(() => {
            notesSavedMessage.style.display = "none";
          }, 3000);

          // إرسال الملاحظات إلى الخادم (اختياري)
          const formData = new FormData();
          formData.append("question", "مسدجات حبيبتي");
          formData.append("answer", personalNotes.value);

          fetch('/submit', {
            method: "POST",
            body: formData,
          }).catch(error => {
            console.error("Error saving notes:", error);
          });
        };

        // إخفاء عناصر واجهة المستخدم الأخرى
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

      // على الرغم من الخطأ، ننتقل إلى الشاشة النهائية إذا كان هذا هو السؤال الأخير
      if (currentQuestionIndex >= questions.length - 1) {
        currentQuestionIndex = questions.length; // تأكد من أننا في نهاية الأسئلة

        // إظهار رسالة الإكمال مع مساحة للملاحظات الخاصة
        questionElement.innerHTML = "<h1>💌 انا مبسوط لو انتي مبسوطة يا يومنتي</h1> <h1> ❤️بحبك </h1>";

        // إضافة مساحة للملاحظات الخاصة
        choicesElement.innerHTML = `
          <div class="notes-container">
            <h3>عشان اي حاجه عاوزه توصليهالي او تطلبيها مني💕</h3>
            <textarea id="personalNotes" placeholder="اكتبي أي حاجة عايزة توصلهالي كلام او طلب او أمنية"></textarea>
            <button id="saveNotesBtn">ابعتي</button>
            <p id="notesSavedMessage" style="display: none; color: #ff6f91; margin-top: 10px;">اتبعتت يروحي ❤️</p>
          </div>
        `;
        // إضافة وظيفة لزر حفظ الملاحظات
        const saveNotesBtn = document.getElementById("saveNotesBtn");
        const personalNotes = document.getElementById("personalNotes");
        const notesSavedMessage = document.getElementById("notesSavedMessage");

        // استرجاع الملاحظات المحفوظة سابقًا
        const savedNotes = localStorage.getItem('personalNotes');
        if (savedNotes) {
          personalNotes.value = savedNotes;
        }

        saveNotesBtn.onclick = () => {
          localStorage.setItem('personalNotes', personalNotes.value);

          // إظهار رسالة التأكيد
          notesSavedMessage.style.display = "block";
          setTimeout(() => {
            notesSavedMessage.style.display = "none";
          }, 3000);
        };

        // إخفاء عناصر واجهة المستخدم الأخرى
        extraInput.style.display = "none";
        submitBtn.style.display = "none";
        recordButton.style.display = "none";
        stopButton.style.display = "none";
        audioPreview.style.display = "none";
        retryButton.style.display = "none";
      }
    });
}

document.addEventListener("DOMContentLoaded", function () {
  // تحميل الإعدادات المحفوظة
  loadSettings();

  // تهيئة وظائف الإعدادات
  initSettings();

  // طلب إذن الإشعارات
  requestNotificationPermission();

  // التحقق من وجود تذكير
  checkReminder();

  // عرض السؤال الأول
  showQuestion();
});

// طلب إذن الإشعارات
function requestNotificationPermission() {
  // التحقق من دعم الإشعارات
  if ('Notification' in window) {
    // طلب الإذن إذا لم يكن ممنوحًا بالفعل
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          console.log('تم منح إذن الإشعارات');
          registerServiceWorker();
        }
      });
    } else if (Notification.permission === 'granted') {
      console.log('إذن الإشعارات ممنوح بالفعل');
      registerServiceWorker();
    }
  }
}

// تسجيل Service Worker للإشعارات
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/reminder-worker.js')
      .then(registration => {
        console.log('تم تسجيل Service Worker للتذكيرات بنجاح:', registration.scope);
        subscribeForPushNotifications(registration);
      })
      .catch(error => {
        console.error('فشل تسجيل Service Worker للتذكيرات:', error);
      });
  }
}

// الاشتراك في إشعارات الدفع
function subscribeForPushNotifications(registration) {
  fetch('/push-subscription')
    .then(response => response.json())
    .then(data => {
      const publicKey = data.publicKey;

      return registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    })
    .then(subscription => {
      // إرسال معلومات الاشتراك إلى الخادم
      return fetch('/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscription)
      });
    })
    .then(response => {
      if (response.ok) {
        console.log('تم الاشتراك في إشعارات الدفع بنجاح');
      }
    })
    .catch(error => {
      console.error('فشل الاشتراك في إشعارات الدفع:', error);
    });
}

// تحويل Base64 URL إلى Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

// التحقق من وجود تذكير
function checkReminder() {
  // التحقق من وجود تذكيرات محفوظة
  const savedReminders = localStorage.getItem('reminders');

  if (savedReminders) {
    const reminders = JSON.parse(savedReminders);

    // التحقق من كل تذكير
    reminders.forEach(reminder => {
      if (reminder.active) {
        // جدولة التذكير
        scheduleReminder(reminder);
      }
    });
  }
}

// جدولة التذكير
function scheduleReminder(reminder) {
  // الحصول على وقت التذكير
  const [hours, minutes] = reminder.time.split(':');

  // إنشاء تاريخ اليوم بالوقت المحدد
  const reminderTime = new Date();
  reminderTime.setHours(parseInt(hours, 10));
  reminderTime.setMinutes(parseInt(minutes, 10));
  reminderTime.setSeconds(0);

  // إذا كان الوقت قد مر، جدولة التذكير لليوم التالي
  if (reminderTime < new Date()) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  // حساب الوقت المتبقي حتى التذكير
  const timeUntilReminder = reminderTime.getTime() - new Date().getTime();

  // جدولة التذكير
  setTimeout(() => {
    // إرسال التذكير
    if (reminder.method === 'browser' && Notification.permission === 'granted') {
      // إرسال إشعار المتصفح
      new Notification('مزاج حبيبتي', {
        body: reminder.message,
        icon: '/icons/icon-192x192.png'
      });
    }

    // جدولة التذكير لليوم التالي
    reminderTime.setDate(reminderTime.getDate() + 1);
    const nextTimeUntilReminder = reminderTime.getTime() - new Date().getTime();

    setTimeout(() => {
      scheduleReminder(reminder);
    }, nextTimeUntilReminder);
  }, timeUntilReminder);
}

// وظائف الإعدادات
function initSettings() {
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeButton = document.querySelector('.close-button');

  // فتح مربع حوار الإعدادات
  settingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'block';
  });

  // إغلاق مربع حوار الإعدادات
  closeButton.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  // إغلاق مربع الحوار عند النقر خارجه
  window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });

  // تفعيل خيارات لون الخلفية
  const colorOptions = document.querySelectorAll('.color-option');
  colorOptions.forEach(option => {
    option.addEventListener('click', () => {
      const color = option.getAttribute('data-color');
      document.body.style.backgroundColor = color;

      // إزالة الفئة النشطة من جميع الخيارات
      colorOptions.forEach(opt => opt.classList.remove('active'));

      // إضافة الفئة النشطة للخيار المحدد
      option.classList.add('active');

      // حفظ الإعداد
      localStorage.setItem('backgroundColor', color);
    });
  });

  // تفعيل خيارات لون الأزرار
  const buttonColorOptions = document.querySelectorAll('.button-color-option');
  buttonColorOptions.forEach(option => {
    option.addEventListener('click', () => {
      const color = option.getAttribute('data-color');

      // تطبيق اللون على جميع الأزرار
      document.querySelectorAll('button').forEach(button => {
        if (!button.classList.contains('color-option') &&
            !button.classList.contains('button-color-option') &&
            !button.classList.contains('font-option')) {
          button.style.backgroundColor = color;
        }
      });

      // تحديث متغير CSS للون الأساسي
      document.documentElement.style.setProperty('--primary-color', color);

      // تحديث متغير RGB للون الأساسي
      const rgbColor = hexToRgb(color);
      if (rgbColor) {
        document.documentElement.style.setProperty('--primary-color-rgb', `${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}`);
      }

      // إزالة الفئة النشطة من جميع الخيارات
      buttonColorOptions.forEach(opt => opt.classList.remove('active'));

      // إضافة الفئة النشطة للخيار المحدد
      option.classList.add('active');

      // حفظ الإعداد
      localStorage.setItem('buttonColor', color);
    });
  });

  // تفعيل خيارات الخط
  const fontOptions = document.querySelectorAll('.font-option');
  fontOptions.forEach(option => {
    option.addEventListener('click', () => {
      const font = option.getAttribute('data-font');
      document.body.style.fontFamily = font;

      // إزالة الفئة النشطة من جميع الخيارات
      fontOptions.forEach(opt => opt.classList.remove('active'));

      // إضافة الفئة النشطة للخيار المحدد
      option.classList.add('active');

      // حفظ الإعداد
      localStorage.setItem('fontFamily', font);
    });
  });
}

// تحميل الإعدادات المحفوظة
function loadSettings() {
  // تحميل لون الخلفية
  const backgroundColor = localStorage.getItem('backgroundColor');
  if (backgroundColor) {
    document.body.style.backgroundColor = backgroundColor;

    // تحديد الخيار النشط
    const colorOption = document.querySelector(`.color-option[data-color="${backgroundColor}"]`);
    if (colorOption) {
      colorOption.classList.add('active');
    }
  }

  // تحميل لون الأزرار
  const buttonColor = localStorage.getItem('buttonColor');
  if (buttonColor) {
    // تطبيق اللون على جميع الأزرار
    document.querySelectorAll('button').forEach(button => {
      if (!button.classList.contains('color-option') &&
          !button.classList.contains('button-color-option') &&
          !button.classList.contains('font-option')) {
        button.style.backgroundColor = buttonColor;
      }
    });

    // تحديث متغير CSS للون الأساسي
    document.documentElement.style.setProperty('--primary-color', buttonColor);

    // تحديد الخيار النشط
    const buttonColorOption = document.querySelector(`.button-color-option[data-color="${buttonColor}"]`);
    if (buttonColorOption) {
      buttonColorOption.classList.add('active');
    }
  }

  // تحميل نوع الخط
  const fontFamily = localStorage.getItem('fontFamily');
  if (fontFamily) {
    document.body.style.fontFamily = fontFamily;

    // تحديد الخيار النشط
    const fontOption = document.querySelector(`.font-option[data-font="${fontFamily}"]`);
    if (fontOption) {
      fontOption.classList.add('active');
    }
  }
}

// دالة لتحويل اللون من تنسيق Hex إلى RGB
function hexToRgb(hex) {
  // التحقق من صحة تنسيق اللون
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}