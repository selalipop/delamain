import Image from "next/image";
import { Inter } from "next/font/google";
import ImageDescription from "@/components/imageDescription";
import Demo from "@/components/demo";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <>
    <ImageDescription/>
    <Demo/></>
    
  );
}
