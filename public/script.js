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
    }
  ];

  let currentQuestionIndex = 0;

  const questionElement = document.getElementById("question");
  const choicesElement = document.getElementById("choices");
  const extraInput = document.getElementById("extraInput");
  const submitBtn = document.getElementById("submitBtn");

  function showQuestion() {
    const currentQuestion = questions[currentQuestionIndex];
    questionElement.innerText = currentQuestion.question;

    choicesElement.innerHTML = "";
    currentQuestion.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.innerText = choice;
      button.addEventListener("click", () => handleAnswer(choice, currentQuestion.extraInput && index === 0));
      choicesElement.appendChild(button);
    });

    extraInput.style.display = "none"; // أخفي خانة النص افتراضيًا
    extraInput.value = "";
    submitBtn.style.display = "none"; // أخفي زر الإرسال افتراضيًا
  }

  function handleAnswer(answer, showExtraInput) {
    if (showExtraInput) {
      extraInput.style.display = "block"; // لو محتاج تكتب حاجة إضافية
      submitBtn.style.display = "block"; // أظهر زر الإرسال
      submitBtn.onclick = () => submitAnswer(answer + " - " + extraInput.value);
    } else {
      submitAnswer(answer);
    }
  }

  function submitAnswer(answer) {
    const currentQuestion = questions[currentQuestionIndex];
    fetch("/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: currentQuestion.question, answer }),
    })
      .then((response) => response.text())
      .then(() => {
        currentQuestionIndex++;
        if (currentQuestionIndex < questions.length) {
          showQuestion();
        } else {
          questionElement.innerHTML = "<h1>💌 انا مبسوط لو انتي مبسوطة يا يومنتي</h1> <h1> ❤️بحبك </h1>";
          choicesElement.innerHTML = "";
          extraInput.style.display = "none";
          submitBtn.style.display = "none";
        }
      })
      .catch((error) => console.error("Error:", error));
  }

  showQuestion();