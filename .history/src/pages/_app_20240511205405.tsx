import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';

export default function App({ Component, pageProps }: AppProps) {
  return <Theme>
    <Component {...pageProps} />
  </Theme>;
}
