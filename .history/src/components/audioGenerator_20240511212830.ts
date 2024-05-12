const VOICE_MIN_DECIBELS = -35;
const DELAY_BETWEEN_DIALOGS = 400;
const DIALOG_MAX_LENGTH = 60 * 1000;

export async function* startRecording() {
  let mediaRecorder: MediaRecorder | null = null;
  let isRecording = false;

  async function record() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return new Promise<Uint8Array | null>((resolve) => {
      // start recording
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();

      // save audio chunks
      const audioChunks: Uint8Array[] = [];
      mediaRecorder.addEventListener("dataavailable", (event) => {
        const chunk = new Uint8Array(event.data);
        audioChunks.push(chunk);
      });

      // analysis
      const audioContext = new AudioContext();
      const audioStreamSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.minDecibels = VOICE_MIN_DECIBELS;
      audioStreamSource.connect(analyser);
      const bufferLength = analyser.frequencyBinCount;
      const domainData = new Uint8Array(bufferLength);

      // loop
      const time = new Date();
      let startTime = time.getTime();
      let lastDetectedTime = time.getTime();
      let anySoundDetected = false;

      const detectSound = () => {
        // recording stopped by user
        if (!isRecording) {
          mediaRecorder?.stop();
          return;
        }

        const currentTime = new Date().getTime();

        // timeout
        if (currentTime > startTime + DIALOG_MAX_LENGTH) {
          mediaRecorder?.stop();
          return;
        }

        // a dialog detected
        if (
          anySoundDetected &&
          currentTime > lastDetectedTime + DELAY_BETWEEN_DIALOGS
        ) {
          mediaRecorder?.stop();
          return;
        }

        // check for detection
        analyser.getByteFrequencyData(domainData);
        for (let i = 0; i < bufferLength; i++) {
          if (domainData[i] > 0) {
            anySoundDetected = true;
            lastDetectedTime = new Date().getTime();
          }
        }

        // continue the loop
        window.requestAnimationFrame(detectSound);
      };

      window.requestAnimationFrame(detectSound);

      // stop event
      mediaRecorder.addEventListener("stop", () => {
        // stop all the tracks
        stream.getTracks().forEach((track) => track.stop());

        if (!anySoundDetected) {
          resolve(null);
          return;
        }

        console.log("audio detected");

        // concatenate audio chunks into a single Uint8Array
        const totalLength = audioChunks.reduce(
          (sum, chunk) => sum + chunk.length,
          0
        );
        const uint8Array = new Uint8Array(totalLength);
        let offset = 0;
        audioChunks.forEach((chunk) => {
          uint8Array.set(chunk, offset);
          offset += chunk.length;
        });

        resolve(uint8Array);
      });
    });
  }

  isRecording = true;
  let audioData = await record();
  while (isRecording) {
    if (audioData) {
      yield audioData;
    }
    audioData = await record();
  }
}