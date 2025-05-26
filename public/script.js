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
      button.classList.add("mood-button");

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
      button.classList.add("mood-button");
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

  // إضافة تفاعل طفولي مع الإجابات
  addMagicalReaction(answer);

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
        // إظهار رسالة الإكمال الجميلة والمتناسقة
        questionElement.innerHTML = "💌 انا مبسوط لو انتي مبسوطة يا يومنتي ❤️";

        // إضافة مساحة للملاحظات الخاصة بتصميم متناسق
        choicesElement.innerHTML = `
          <div class="final-container">
            <div class="love-message">
              <h2>بحبك يا أحلى حاجة في الدنيا 💕</h2>
              <p>لو عايزة توصليلي أي حاجة (اختياري)</p>
            </div>
            <div class="notes-section">
              <textarea id="personalNotes" placeholder="اكتبي أي حاجة عايزة توصلهالي... (مش مطلوب) 🌸"></textarea>
              <div class="final-buttons">
                <button id="saveNotesBtn" class="mood-button final-btn">ابعتي 💖</button>
                <button id="skipBtn" class="mood-button skip-btn">مفيش حاجة ✨</button>
              </div>
              <p id="notesSavedMessage" class="success-message">اتبعتت يروحي ❤️</p>
            </div>
          </div>
        `;

        // إضافة وظيفة لزر حفظ الملاحظات
        const saveNotesBtn = document.getElementById("saveNotesBtn");
        const skipBtn = document.getElementById("skipBtn");
        const personalNotes = document.getElementById("personalNotes");
        const notesSavedMessage = document.getElementById("notesSavedMessage");

        // استرجاع الملاحظات المحفوظة سابقًا
        const savedNotes = localStorage.getItem('personalNotes');
        if (savedNotes) {
          personalNotes.value = savedNotes;
        }

        saveNotesBtn.onclick = () => {
          if (personalNotes.value.trim() === "") {
            personalNotes.style.animation = 'gentle-comfort 0.5s ease-out';
            personalNotes.focus();
            return;
          }

          localStorage.setItem('personalNotes', personalNotes.value);

          // إضافة تفاعل سحري للإرسال النهائي
          addMagicalReaction('رسالة حب نهائية');

          // إظهار رسالة التأكيد
          notesSavedMessage.style.display = "block";
          setTimeout(() => {
            notesSavedMessage.style.display = "none";
          }, 4000);

          // إرسال الملاحظات إلى الخادم (اختياري)
          const formData = new FormData();
          formData.append("question", "رسائل حبيبتي الخاصة");
          formData.append("answer", personalNotes.value);

          fetch('/submit', {
            method: "POST",
            body: formData,
          }).catch(error => {
            console.error("Error saving notes:", error);
          });

          // تعطيل الزر مؤقتاً
          saveNotesBtn.disabled = true;
          saveNotesBtn.textContent = "تم الإرسال 💕";
          setTimeout(() => {
            saveNotesBtn.disabled = false;
            saveNotesBtn.textContent = "ابعتي 💖";
          }, 3000);
        };

        // إضافة وظيفة زر التخطي
        skipBtn.onclick = () => {
          // إضافة تفاعل لطيف للتخطي
          addMagicalReaction('تخطي لطيف');

          // إظهار رسالة تأكيد
          notesSavedMessage.textContent = "اشطا يروحي ❤️";
          notesSavedMessage.style.display = "block";

          setTimeout(() => {
            notesSavedMessage.style.display = "none";
          }, 2000);
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

// 🌟 دالة التفاعل السحري مع الإجابات - محسنة ومتوازنة
function addMagicalReaction(answer) {
  const app = document.getElementById('app');

  // تحديد نوع التفاعل بناءً على الإجابة
  let reactionType = 'neutral';
  let emojis = ['💖', '✨'];
  let colors = ['#ff9eb5', '#ffe4b5'];
  let intensity = 'normal';

  if (answer.includes('مبسوطه') || answer.includes('مبسوطة') || answer.includes('سعيدة')) {
    reactionType = 'happy';
    emojis = ['💕', '🌸', '✨', '💖'];
    colors = ['#ff9eb5', '#ffd6e7', '#ffe4b5'];
    intensity = 'high';
  } else if (answer.includes('متضايقة') || answer.includes('مش مبسوطه') || answer.includes('حزينة') || answer.includes('زعلانة')) {
    reactionType = 'comfort';
    emojis = ['💙', '😞'];
    colors = ['#bbdefb', '#d1c4e9'];
    intensity = 'low';
  } else if (answer.includes('عاوزة أكتب') || answer.includes('عاوزة أسجل')) {
    reactionType = 'creative';
    emojis = ['✨', '💫', '🌟'];
    colors = ['#ffe4b5', '#c8e6c9'];
    intensity = 'medium';
  }

  // إضافة تأثير لطيف للبطاقة حسب الشدة
  if (intensity === 'low') {
    app.style.animation = 'gentle-comfort 0.8s ease-out';
  } else if (intensity === 'high') {
    app.style.animation = 'happy-reaction 0.6s ease-out';
  } else {
    app.style.animation = 'soft-reaction 0.5s ease-out';
  }

  // إنشاء تفاعل مناسب
  createEmojiExplosion(emojis, colors, intensity);

  // إضافة تأثير لوني مؤقت للخلفية
  addTemporaryColorEffect(colors[0], intensity);

  // إعادة ضبط الانيميشن بعد انتهائه
  setTimeout(() => {
    app.style.animation = '';
  }, 800);
}

// 🎆 دالة إنشاء انفجار الإيموجي - محسنة مع شدة متغيرة
function createEmojiExplosion(emojis, colors, intensity = 'normal') {
  const container = document.body;

  // تحديد عدد الإيموجي حسب الشدة
  let numberOfEmojis;
  let animationDuration;
  let distance;

  switch (intensity) {
    case 'low':
      numberOfEmojis = 3;
      animationDuration = 2;
      distance = 80;
      break;
    case 'high':
      numberOfEmojis = 6;
      animationDuration = 1.2;
      distance = 120;
      break;
    default:
      numberOfEmojis = 4;
      animationDuration = 1.5;
      distance = 100;
  }

  for (let i = 0; i < numberOfEmojis; i++) {
    const emoji = document.createElement('div');
    emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    emoji.style.position = 'fixed';
    emoji.style.fontSize = intensity === 'low' ? '1.5rem' : '1.8rem';
    emoji.style.pointerEvents = 'none';
    emoji.style.zIndex = '9999';
    emoji.style.left = '50%';
    emoji.style.top = '50%';
    emoji.style.transform = 'translate(-50%, -50%)';
    emoji.style.filter = `drop-shadow(0 0 8px ${colors[Math.floor(Math.random() * colors.length)]})`;

    // حساب اتجاه عشوائي
    const angle = (Math.PI * 2 * i) / numberOfEmojis;
    const finalDistance = distance + Math.random() * 50;
    const endX = Math.cos(angle) * finalDistance;
    const endY = Math.sin(angle) * finalDistance;

    // إضافة الانيميشن
    emoji.style.animation = `gentle-emoji-float ${animationDuration}s ease-out forwards`;
    emoji.style.setProperty('--end-x', endX + 'px');
    emoji.style.setProperty('--end-y', endY + 'px');

    container.appendChild(emoji);

    // إزالة الإيموجي بعد انتهاء الانيميشن
    setTimeout(() => {
      if (emoji.parentNode) {
        emoji.parentNode.removeChild(emoji);
      }
    }, animationDuration * 1000);
  }
}

// 🌈 دالة إضافة تأثير لوني مؤقت - محسنة مع شدة متغيرة
function addTemporaryColorEffect(color, intensity = 'normal') {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';

  // تحديد شدة التأثير
  let opacity, duration, animationName;

  switch (intensity) {
    case 'low':
      opacity = '10';
      duration = 1.5;
      animationName = 'gentle-color-pulse';
      break;
    case 'high':
      opacity = '25';
      duration = 0.8;
      animationName = 'vibrant-color-pulse';
      break;
    default:
      opacity = '15';
      duration = 1;
      animationName = 'soft-color-pulse';
  }

  overlay.style.background = `radial-gradient(circle at center, ${color}${opacity} 0%, transparent 60%)`;
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '1';
  overlay.style.animation = `${animationName} ${duration}s ease-out`;

  document.body.appendChild(overlay);

  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }, duration * 1000);
}

// 🎨 نظام تبديل الثيمات
let currentTheme = 'pink'; // الثيم الافتراضي

function initThemeSystem() {
  // تحميل الثيم المحفوظ
  const savedTheme = localStorage.getItem('selectedTheme') || 'pink';
  switchTheme(savedTheme);
}

function switchTheme(themeName) {
  const head = document.head;

  // إزالة أي ثيم CSS موجود
  const existingThemeLink = document.getElementById('theme-css');
  if (existingThemeLink) {
    existingThemeLink.remove();
  }

  // إضافة الثيم الجديد
  if (themeName === 'blue') {
    const blueThemeLink = document.createElement('link');
    blueThemeLink.id = 'theme-css';
    blueThemeLink.rel = 'stylesheet';
    blueThemeLink.href = 'blue-theme.css';
    head.appendChild(blueThemeLink);
    currentTheme = 'blue';
  } else {
    // الثيم الوردي هو الافتراضي في styles.css
    currentTheme = 'pink';
  }

  // حفظ الثيم المختار
  localStorage.setItem('selectedTheme', currentTheme);

  // إضافة تأثير انتقال سلس
  document.body.style.transition = 'all 0.5s ease-in-out';
  setTimeout(() => {
    document.body.style.transition = '';
  }, 500);
}

function toggleTheme() {
  const newTheme = currentTheme === 'pink' ? 'blue' : 'pink';
  switchTheme(newTheme);

  // إضافة تفاعل لطيف عند تغيير الثيم
  const app = document.getElementById('app');
  if (app) {
    app.style.animation = 'theme-switch 0.8s ease-out';
    setTimeout(() => {
      app.style.animation = '';
    }, 800);
  }
}

// تحديث modal الإعدادات لإضافة خيار الثيمات فقط
function updateSettingsModal() {
  const modalContent = document.querySelector('.modal-content');
  if (modalContent) {
    // استبدال كل المحتوى بالثيمات فقط
    modalContent.innerHTML = `
      <span class="close">&times;</span>
      <h2>اختيار الثيم</h2>
      <div class="theme-options">
        <button class="theme-option ${currentTheme === 'pink' ? 'active' : ''}" data-theme="pink">
          <div class="theme-preview pink-preview"></div>
          <div class="theme-info">
            <h3>🌸 ثيم بينك</h3>
            <p>عشان بنوتي حبيبتي🥹❤️</p>
          </div>
        </button>
        <button class="theme-option ${currentTheme === 'blue' ? 'active' : ''}" data-theme="blue">
          <div class="theme-preview blue-preview"></div>
          <div class="theme-info">
            <h3>💙 ثيم الأزرق</h3>
            <p>عشان يمنى اميرتي❤️👑</p>
          </div>
        </button>
      </div>
    `;

    // إضافة CSS محسن للثيمات (مرة واحدة فقط)
    if (!document.getElementById('theme-modal-styles')) {
      const themeStyles = document.createElement('style');
      themeStyles.id = 'theme-modal-styles';
      themeStyles.textContent = `
      .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        backdrop-filter: blur(5px);
      }

      .modal-content {
        background: white;
        margin: 8% auto;
        padding: 40px;
        border-radius: 25px;
        width: 90%;
        max-width: 450px;
        box-shadow: 0 25px 80px rgba(0,0,0,0.3);
        position: relative;
        animation: modalSlideIn 0.4s ease-out;
        font-family: 'Cairo', sans-serif;
      }

      .modal-content h2 {
        text-align: center;
        margin-bottom: 35px;
        font-size: 2rem;
        color: #2c3e50;
        font-weight: 700;
        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }

      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-50px) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .theme-options {
        display: flex;
        gap: 20px;
        flex-direction: column;
      }

      .theme-option {
        display: flex;
        align-items: center;
        gap: 25px;
        padding: 25px;
        border: 3px solid #e8e8e8;
        border-radius: 20px;
        background: #fafafa;
        cursor: pointer;
        transition: all 0.4s ease;
        font-family: 'Cairo', sans-serif;
        position: relative;
        overflow: hidden;
      }

      .theme-option::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
        transition: left 0.6s ease;
      }

      .theme-option:hover::before {
        left: 100%;
      }

      .theme-option:hover {
        transform: translateY(-5px);
        box-shadow: 0 12px 35px rgba(0,0,0,0.15);
        border-color: #bbb;
        background: white;
      }

      .theme-option.active {
        border-color: #3498db;
        background: linear-gradient(135deg, rgba(52, 152, 219, 0.1), white);
        transform: translateY(-5px);
        box-shadow: 0 15px 40px rgba(52, 152, 219, 0.3);
      }

      .theme-option.active::after {
        content: '✓';
        position: absolute;
        top: 15px;
        right: 20px;
        font-size: 1.5rem;
        color: #3498db;
        font-weight: bold;
      }

      .theme-preview {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        flex-shrink: 0;
        position: relative;
        overflow: hidden;
      }

      .pink-preview {
        background: linear-gradient(135deg, #ff9eb5, #ffd6e7, #ffe4b5);
        box-shadow: 0 4px 15px rgba(255, 158, 181, 0.4);
      }

      .blue-preview {
        background: linear-gradient(135deg, #3498db, #5dade2, #85c1e9);
        box-shadow: 0 4px 15px rgba(52, 152, 219, 0.4);
      }

      .theme-preview::after {
        content: '';
        position: absolute;
        top: 10px;
        left: 10px;
        width: 40px;
        height: 40px;
        background: rgba(255,255,255,0.3);
        border-radius: 50%;
        animation: gentle-pulse 2s infinite;
      }

      .theme-info h3 {
        margin: 0 0 8px 0;
        font-size: 1.4rem;
        font-weight: 700;
        color: #2c3e50;
        text-shadow: 0 1px 2px rgba(0,0,0,0.1);
      }

      .theme-info p {
        margin: 0;
        font-size: 1.1rem;
        color: #5d6d7e;
        font-weight: 500;
        opacity: 0.9;
      }

      .theme-option.active .theme-info h3 {
        color: #3498db;
      }

      .theme-option.active .theme-info p {
        color: #2980b9;
      }

      .close {
        position: absolute;
        top: 20px;
        right: 25px;
        width: 35px;
        height: 35px;
        font-size: 24px;
        font-weight: bold;
        cursor: pointer;
        color: #95a5a6;
        transition: all 0.3s ease;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f8f9fa;
        border: 2px solid #e9ecef;
      }

      .close:hover {
        color: #e74c3c;
        background: #fff5f5;
        border-color: #e74c3c;
        transform: scale(1.1);
      }

      @keyframes gentle-pulse {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.1); }
      }

      /* Responsive للمودال */
      @media (max-width: 768px) {
        .modal-content {
          margin: 5% auto;
          padding: 30px 25px;
          width: 95%;
        }

        .modal-content h2 {
          font-size: 1.7rem;
          margin-bottom: 25px;
        }

        .theme-option {
          padding: 20px;
          gap: 20px;
        }

        .theme-preview {
          width: 50px;
          height: 50px;
        }

        .theme-info h3 {
          font-size: 1.2rem;
        }

        .theme-info p {
          font-size: 1rem;
        }
      }

      @media (max-width: 480px) {
        .modal-content {
          margin: 3% auto;
          padding: 25px 20px;
          width: 98%;
        }

        .modal-content h2 {
          font-size: 1.5rem;
          margin-bottom: 20px;
        }

        .theme-option {
          padding: 18px;
          gap: 15px;
        }

        .theme-preview {
          width: 45px;
          height: 45px;
        }

        .theme-info h3 {
          font-size: 1.1rem;
        }

        .theme-info p {
          font-size: 0.95rem;
        }

        .close {
          top: 15px;
          right: 20px;
          width: 30px;
          height: 30px;
          font-size: 20px;
        }
      }
    `;
      document.head.appendChild(themeStyles);
    }

    // إضافة event listeners
    const closeBtn = modalContent.querySelector('.close');
    closeBtn.addEventListener('click', () => {
      document.getElementById('settingsModal').style.display = 'none';
    });

    const themeOptions = document.querySelectorAll('.theme-option');
    themeOptions.forEach(option => {
      option.addEventListener('click', () => {
        const selectedTheme = option.getAttribute('data-theme');
        switchTheme(selectedTheme);

        // تحديث الأزرار النشطة
        themeOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');

        // إغلاق المودال بعد التغيير
        setTimeout(() => {
          document.getElementById('settingsModal').style.display = 'none';
        }, 500);
      });
    });
  }
}

// تهيئة نظام الثيمات عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  initThemeSystem();

  // تحديث المودال عند فتحه
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      // إظهار المودال
      const modal = document.getElementById('settingsModal');
      if (modal) {
        modal.style.display = 'block';
        setTimeout(updateSettingsModal, 50);
      }
    });
  }

  // إغلاق المودال عند الضغط خارجه
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('settingsModal');
    if (event.target === modal) {
      modal.style.display = 'none';
    }
  });
});