// utils/swal.js
import Swal from 'sweetalert2';

export const swalConfirm = (message = "Are you sure?", confirmText = "Yes") => {
  return Swal.fire({
    title: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    width: '300px', // reduce width
    customClass: {
      title: 'swal-title-custom',
      content: 'swal-content-custom',
      confirmButton: 'swal-confirm-btn',
      cancelButton: 'swal-cancel-btn',
    },
  }).then(result => result.isConfirmed);
};


export const swalSuccess = (message) => {
  Swal.fire({
    icon: 'success',
    title: message,
    toast: true,
    position: 'top-end',
    timer: 2000,
    showConfirmButton: false,
  });
};

export const swalError = (message) => {
  Swal.fire({
    icon: 'error',
    title: message,
    toast: true,
    position: 'top-end',
    timer: 2000,
    showConfirmButton: false,
  });
};
