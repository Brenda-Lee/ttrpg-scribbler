import Image from "next/image";
import Editor from "../components/Editor";

export default function Home() {
  return (
    <div>
      <Image 
        src="/next.svg"
        alt="Next.js logo"
        width={180}
        height={38}
        priority />
      <Editor />
  </div>
  );
}
