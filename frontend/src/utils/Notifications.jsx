import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const Toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  showCloseButton: true,   
  timer: 8000,           
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener("mouseenter", Swal.stopTimer);
    toast.addEventListener("mouseleave", Swal.resumeTimer);
  },
});

export const notifySuccess = (msg = "Success") => {
  Toast.fire({ icon: "success", title: msg });
};

export const notifyError = (msg = "Error") => {
  Toast.fire({ icon: "error", title: msg });
};

export const notifyInfo = (msg = "Info") => {
  Toast.fire({ icon: "info", title: msg });
};

export const handleApiResponse = (response) => {
  if (response?.success) {
    notifySuccess(response.message || "Done");
  } else {
    const msg = response?.message || "Something went wrong";
    notifyError(msg);
    if (response?.errors) {
      Object.values(response.errors).forEach((e) => notifyError(String(e)));
    }
  }
};

export const showToast = (type, msg) => {
  if (type === "success") notifySuccess(msg);
  else if (type === "error") notifyError(msg);
  else notifyInfo(msg);
};
