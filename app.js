
// ==========================================
// NIMS EXECUTION DOCUMENTATION
// Frontend application
// ==========================================

// Your published Google Apps Script Web App URL
const API_URL =
  "https://script.google.com/macros/s/AKfycbw0-O-TLL92b8HnuRqNo4OpLQhkJR9SYYq9zx2tlpXH2nBtxLTu_9i78FzropebQ4C3Jg/exec";

// Maximum file size: 4 MB
const MAX_FILE_SIZE = 4 * 1024 * 1024;

// Allowed file extensions
const ALLOWED_EXTENSIONS = [
  "py", "cs", "js", "html", "css", "sql",
  "json", "xml", "yaml", "yml", "txt", "md",
  "pdf", "docx", "xlsx", "png", "jpg", "jpeg",
  "zip", "cfg", "conf", "ini", "csv", "log",
  "gns3", "drawio"
];

// ==========================================
// PAGE ELEMENTS
// ==========================================

const uploadForm =
  document.getElementById("uploadForm");

const fileInput =
  document.getElementById("fileInput");

const fileInfo =
  document.getElementById("fileInfo");

const submitButton =
  document.getElementById("submitButton");

const buttonText =
  document.getElementById("buttonText");

const resultBox =
  document.getElementById("resultBox");

const resultTitle =
  document.getElementById("resultTitle");

const resultMessage =
  document.getElementById("resultMessage");


// ==========================================
// DEFAULT DATE
// ==========================================

const dateInput =
  document.getElementById("workDate");

const today = new Date();

const localDate =
  today.getFullYear() + "-" +
  String(today.getMonth() + 1).padStart(2, "0") + "-" +
  String(today.getDate()).padStart(2, "0");

dateInput.value = localDate;


// ==========================================
// FILE SIZE FORMAT
// ==========================================

function formatFileSize(bytes) {

  if (bytes < 1024) {
    return bytes + " B";
  }

  if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(1) + " KB";
  }

  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}


// ==========================================
// FILE SELECTION
// ==========================================

fileInput.addEventListener("change", function () {

  const file = fileInput.files[0];

  fileInfo.classList.add("hidden");

  if (!file) {
    return;
  }

  const extension =
    file.name.includes(".")
      ? file.name.split(".").pop().toLowerCase()
      : "";

  if (!ALLOWED_EXTENSIONS.includes(extension)) {

    fileInput.value = "";

    showResult(
      false,
      "نوع الملف غير مسموح",
      "اختر ملفاً بامتداد موجود ضمن قائمة الملفات المدعومة."
    );

    return;
  }

  if (file.size === 0) {

    fileInput.value = "";

    showResult(
      false,
      "ملف فارغ",
      "لا يمكن رفع ملف فارغ."
    );

    return;
  }

  if (file.size > MAX_FILE_SIZE) {

    fileInput.value = "";

    showResult(
      false,
      "حجم الملف كبير",
      "الحد الأقصى لحجم الملف هو 4 MB."
    );

    return;
  }

  fileInfo.innerHTML = "";

  const name = document.createElement("span");
  name.textContent = "📎 " + file.name;

  const size = document.createElement("span");
  size.textContent = formatFileSize(file.size);

  fileInfo.appendChild(name);
  fileInfo.appendChild(size);

  fileInfo.classList.remove("hidden");

  hideResult();

});


// ==========================================
// DISPLAY RESULT
// ==========================================

function showResult(success, title, message) {

  resultBox.classList.remove("hidden", "success", "error");

  resultBox.classList.add(
    success ? "success" : "error"
  );

  resultTitle.textContent =
    (success ? "✓ " : "⚠ ") + title;

  resultTitle.style.color =
    success ? "#32c48d" : "#f16d73";

  resultMessage.textContent = message;

}

function hideResult() {

  resultBox.classList.add("hidden");

}


// ==========================================
// BUTTON STATE
// ==========================================

function setLoading(loading) {

  submitButton.disabled = loading;

  buttonText.textContent = loading
    ? "جارٍ إرسال الملف..."
    : "إرسال وتوثيق العمل";

}


// ==========================================
// CREATE UNIQUE REQUEST ID
// ==========================================

function createRequestId() {

  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {

    return window.crypto.randomUUID();

  }

  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2)
  );

}


// ==========================================
// READ FILE AS BASE64
// ==========================================

function readFileAsBase64(file) {

  return new Promise(function (resolve, reject) {

    const reader = new FileReader();

    reader.onload = function () {

      const result = String(reader.result || "");

      const commaIndex = result.indexOf(",");

      if (commaIndex === -1) {

        reject(
          new Error("تعذرت قراءة الملف.")
        );

        return;
      }

      resolve(
        result.substring(commaIndex + 1)
      );

    };

    reader.onerror = function () {

      reject(
        new Error("حدث خطأ أثناء قراءة الملف.")
      );

    };

    reader.readAsDataURL(file);

  });

}


// ==========================================
// SEND DATA THROUGH A HIDDEN IFRAME
// ==========================================

function sendToGoogleAppsScript(payload) {

  return new Promise(function (resolve, reject) {

    const requestId = payload.requestId;

    const frameName =
      "nims_frame_" + requestId.replace(/-/g, "");

    const iframe =
      document.createElement("iframe");

    iframe.name = frameName;
    iframe.title = "NIMS upload response";
    iframe.style.display = "none";

    const form =
      document.createElement("form");

    form.method = "POST";
    form.action = API_URL;
    form.target = frameName;
    form.enctype = "application/x-www-form-urlencoded";
    form.acceptCharset = "UTF-8";
    form.style.display = "none";

    const input =
      document.createElement("textarea");

    input.name = "payload";
    input.value = JSON.stringify(payload);

    form.appendChild(input);

    document.body.appendChild(iframe);
    document.body.appendChild(form);

    let finished = false;

    function cleanup() {

      window.removeEventListener(
        "message",
        handleMessage
      );

      if (form.parentNode) {
        form.parentNode.removeChild(form);
      }

      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }

    }

    function finish(error, result) {

      if (finished) {
        return;
      }

      finished = true;

      clearTimeout(timeout);

      cleanup();

      if (error) {
        reject(error);
      } else {
        resolve(result);
      }

    }

    function handleMessage(event) {

      const data = event.data;

      if (
        !data ||
        data.type !== "NIMS_UPLOAD_RESULT" ||
        data.requestId !== requestId
      ) {
        return;
      }

      if (data.ok === true) {

        finish(null, data);

      } else {

        finish(
          new Error(
            data.message || "فشل رفع الملف."
          )
        );

      }

    }

    window.addEventListener(
      "message",
      handleMessage
    );

    const timeout = setTimeout(function () {

      finish(
        new Error(
          "لم يصل تأكيد من خدمة الرفع خلال 90 ثانية. لا تعاود الإرسال قبل التحقق من Drive وسجل الرفع."
        )
      );

    }, 90000);

    try {

      form.submit();

    } catch (error) {

      finish(error);

    }

  });

}


// ==========================================
// FORM SUBMISSION
// ==========================================

uploadForm.addEventListener("submit", async function (event) {

  event.preventDefault();

  hideResult();

  const actorName =
    document.getElementById("actorName").value.trim();

  const wbsId =
    document.getElementById("wbsId").value.trim().toUpperCase();

  const taskName =
    document.getElementById("taskName").value.trim();

  const status =
    document.getElementById("status").value;

  const workDate =
    document.getElementById("workDate").value;

  const description =
    document.getElementById("description").value.trim();

  const actualResult =
    document.getElementById("actualResult").value.trim();

  const website =
    document.getElementById("website").value.trim();

  const file =
    fileInput.files[0];

  // ------------------------------
  // Validate required fields
  // ------------------------------

  if (
    !actorName ||
    !wbsId ||
    !taskName ||
    !description
  ) {

    showResult(
      false,
      "بيانات ناقصة",
      "يرجى تعبئة الحقول المطلوبة."
    );

    return;
  }

  if (!/^WBS-[A-Z0-9-]{1,32}$/.test(wbsId)) {

    showResult(
      false,
      "معرّف المهمة غير صحيح",
      "استخدم الصيغة الصحيحة، مثل WBS-001."
    );

    return;
  }

  if (!file) {

    showResult(
      false,
      "لم يتم اختيار ملف",
      "اختر الملف الذي تريد إرفاقه."
    );

    return;
  }

  if (file.size > MAX_FILE_SIZE || file.size === 0) {

    showResult(
      false,
      "حجم الملف غير صالح",
      "يجب أن يكون الملف أكبر من صفر وألا يتجاوز 4 MB."
    );

    return;
  }

  const extension =
    file.name.split(".").pop().toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(extension)) {

    showResult(
      false,
      "امتداد غير مدعوم",
      "اختر ملفاً من أنواع الملفات المسموح بها."
    );

    return;
  }

  // ------------------------------
  // Prepare request
  // ------------------------------

  setLoading(true);

  try {

    const base64 =
      await readFileAsBase64(file);

    const payload = {

      requestId: createRequestId(),

      actorName: actorName,

      wbsId: wbsId,

      taskName: taskName,

      status: status,

      workDate: workDate,

      description: description,

      actualResult: actualResult,

      fileName: file.name,

      fileSize: file.size,

      base64: base64,

      website: website

    };

    // ------------------------------
    // Send request
    // ------------------------------

    const result =
      await sendToGoogleAppsScript(payload);

    // ------------------------------
    // Successful upload
    // ------------------------------

    showResult(
      true,
      "تم إرسال الملف بنجاح",
      "اسم الملف: " + result.fileName +
      " — تم حفظ الملف وتسجيل بيانات الرفع."
    );

    uploadForm.reset();

    dateInput.value = localDate;

    fileInfo.classList.add("hidden");

  } catch (error) {

    console.error("NIMS upload error:", error);

    showResult(
      false,
      "تعذر تأكيد عملية الرفع",
      error.message ||
      "حدث خطأ غير متوقع. تحقق من اتصال الإنترنت والخدمة."
    );

  } finally {

    setLoading(false);

  }

});
