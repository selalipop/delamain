import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { Button, Container, Flex } from "@radix-ui/themes";
import {
  initialize,
  SessionManager,
  DecodingOptionsBuilder,
  Segment,
  AvailableModels,
  Task,
} from "whisper-turbo";
import { blobToUint8Array, startRecording } from "./audioGenerator";

const ImageDescription: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageDescription, setImageDescription] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const transcribeTask = new Promise(async () => {
    await initialize();
    const session = await new SessionManager().loadModel(
      AvailableModels.WHISPER_TINY,
      () => {
        console.log("Model loaded successfully");
      },
      (p: number) => {
        console.log(`Loading: ${p}%`);
      }
    );
    if (session.isOk) {
      let options = new DecodingOptionsBuilder()
        .setTask(Task.Transcribe)
        .build();
      const audioGenerator = startRecording();
      while (true) {
        const audioData : Blob = await audioGenerator.next();
        await session.value.transcribe(
          await blobToUint8Array(audioData),
          true,
          options,
          (segment: Segment) => {
            console.log(segment);
          }
        );
      }
    } else {
      console.error("Error initializing Whisper-Turbo", session.error);
    }
  });
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
      console.error("Error accessing webcam:", error);
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
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        const imageBase64 = encodeImage(canvasRef.current);
        getImageDescription(imageBase64);
      }
    }
  };

  const encodeImage = (canvas: HTMLCanvasElement): string => {
    const dataURL = canvas.toDataURL("image/jpeg");
    return dataURL.split(",")[1];
  };

  const getImageDescription = async (imageBase64: string) => {
    const url = "https://api.fireworks.ai/inference/v1/chat/completions";
    const payload = {
      model: "accounts/fireworks/models/llava-yi-34b",
      max_tokens: 512,
      top_p: 1,
      top_k: 40,
      presence_penalty: 0,
      frequency_penalty: 0,
      temperature: 0.3,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are looking at a picture of 1 or more persons. Ignore everything but the people. 
              Return the following: 
              1. How many people are in the image. 
              2. What is each person in the image doing. 
              3. What is the pose of each person? Are they looking at the camera, or away.
              4. What is the facial expression of each person? Use 1-2 words to describe this`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    };
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: "Bearer nTBpiFwEG3LJi2c1R4ojUCPmIMmWC0IFc1nMjCiA1BUGAFJ9",
    };

    try {
      const response = await axios.post(url, payload, { headers });
      if (response.status === 200) {
        setImageDescription(response.data.choices[0].message.content);
      } else {
        setImageDescription(`Error: ${response.status} - ${response.data}`);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="w-full h-full">
      <Container mx="2">
        <video ref={videoRef} autoPlay playsInline muted />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <Flex className="w-full" justify={"center"} gap="3">
          <Button
            onClick={startStreaming}
            disabled={isStreaming}
            variant="surface"
          >
            Start
          </Button>
          <Button
            onClick={stopStreaming}
            disabled={!isStreaming}
            variant="surface"
          >
            Stop
          </Button>
        </Flex>
        <div>{imageDescription}</div>
      </Container>
    </div>
  );
};

export default ImageDescription;