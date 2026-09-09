let checkoutScript;
export function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (checkoutScript) return checkoutScript;
  checkoutScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    const timer = setTimeout(() => {
      checkoutScript = null;
      script.remove();
      reject(
        new Error('Checkout took too long to load. Please check your connection and try again.'),
      );
    }, 15000);
    script.onload = () => {
      clearTimeout(timer);
      resolve(window.Razorpay);
    };
    script.onerror = () => {
      clearTimeout(timer);
      checkoutScript = null;
      script.remove();
      reject(new Error('Unable to load Razorpay checkout. Please try again.'));
    };
    document.head.appendChild(script);
  });
  return checkoutScript;
}
