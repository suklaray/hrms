// utils/confirmDialog.ts
import Swal from 'sweetalert2';

export const swalConfirm = (message: string = "Are you sure?", confirmText: boolean | string = "Yes") => {
  return (Swal.fire as any)({
    title: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: 'Cancel',
    reverseButtons: true,
    width: '300px',
    customClass: {
      title: 'swal-title-custom',
      htmlContainer: 'swal-content-custom',
      confirmButton: 'swal-confirm-btn',
      cancelButton: 'swal-cancel-btn',
    },
  }).then((result: any) => result.isConfirmed);
};

export const swalSuccess = (message: string) => {
  Swal.fire({
    icon: 'success',
    title: message,
    toast: true,
    position: 'top-end',
    timer: 2000,
    showConfirmButton: false,
  });
};

export const swalError = (message: string) => {
  Swal.fire({
    icon: 'error',
    title: message,
    toast: true,
    position: 'top-end',
    timer: 2000,
    showConfirmButton: false,
  });
};
