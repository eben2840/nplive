// Camera QR reading for the door page: jsQR on a canvas, so it also works on iPhones.
'use strict';
window.DoorScanner = (() => {
  const video = document.getElementById('video');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  let stream = null, timer = null, last = '', lastAt = 0;

  function tick(onCode) {
    if (video.readyState >= 2) {
      const w = video.videoWidth, h = video.videoHeight;
      canvas.width = w; canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const code = window.jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      // The same code still in view is read once, not every frame.
      if (code && code.data && !(code.data === last && Date.now() - lastAt < 4000)) {
        last = code.data; lastAt = Date.now();
        onCode(code.data);
      }
    }
    timer = setTimeout(() => tick(onCode), 200);
  }

  async function start(onCode) {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    await video.play();
    tick(onCode);
  }

  function stop() {
    clearTimeout(timer);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    stream = null;
    video.srcObject = null;
  }

  return { start, stop };
})();
