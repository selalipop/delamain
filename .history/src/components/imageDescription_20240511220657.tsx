import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import { Button, Container, Flex } from "@radix-ui/themes";

const useImageTranscription = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageDescription, setImageDescription] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
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

    let interval: NodeJS.Timeout;
    if (isStreaming) {
      interval = setInterval(captureImage, 3000);
    }
    return () => clearInterval(interval);
  }, [isStreaming]);

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

  return {
    videoRef,
    imageDescription,
    isStreaming,
    startStreaming,
    stopStreaming,
  };
};

const ImageDescription: React.FC = () => {
  const {
    videoRef,
    imageDescription,
    isStreaming,
    startStreaming,
    stopStreaming,
  } = useImageTranscription();

  return (
    <div className="w-full h-full">
      <Container mx="2">
        <video ref={videoRef} autoPlay playsInline muted />
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
