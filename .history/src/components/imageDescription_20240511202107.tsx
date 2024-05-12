import React, { useRef, useState, useEffect } from 'react';
import axios from 'axios';

const ImageDescription: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageDescription, setImageDescription] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(captureImage, 3000);
      return () => clearInterval(interval);
    }
  }, [isStreaming]);

  const startStreaming = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsStreaming(true);
    } catch (error) {
      console.error('Error accessing webcam:', error);
    }
  };

  const stopStreaming = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      setIsStreaming(false);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const imageBase64 = encodeImage(canvasRef.current);
        getImageDescription(imageBase64);
      }
    }
  };

  const encodeImage = (canvas: HTMLCanvasElement): string => {
    const dataURL = canvas.toDataURL('image/jpeg');
    return dataURL.split(',')[1];
  };

  const getImageDescription = async (imageBase64: string) => {
    const url = 'https://api.fireworks.ai/inference/v1/chat/completions';
    const payload = {
      model: 'accounts/fireworks/models/firellava-13b',
      max_tokens: 512,
      top_p: 1,
      top_k: 40,
      presence_penalty: 0,
      frequency_penalty: 0,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are looking at a picture of 1 or more persons in a vehicle. 
              Return the following: 
              1. How many people are in the image. 
              2. What is each person in the image doing. 
              3. Are the people in the image busy? 
                If they're looking at the camera assume they are not busy. 
                If they're looking away from the camera but not at a phone of laptop, 
                assume they're slightly busy`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    };
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: 'Bearer nTBpiFwEG3LJi2c1R4ojUCPmIMmWC0IFc1nMjCiA1BUGAFJ9',
    };

    try {
      const response = await axios.post(url, payload, { headers });
      if (response.status === 200) {
        setImageDescription(response.data.choices[0].message.content);
      } else {
        setImageDescription(`Error: ${response.status} - ${response.data}`);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div>
      <video ref={videoRef} autoPlay playsInline muted />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div>
        <button onClick={startStreaming} disabled={isStreaming}>
          Start
        </button>
        <button onClick={stopStreaming} disabled={!isStreaming}>
          Stop
        </button>
      </div>
      <div>{imageDescription}</div>
    </div>
  );
};

export default ImageDescription;