import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";

import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import React from "react";

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <Theme scaling="110%">
      <Component {...pageProps} />
    </Theme>
  );
};

export default dynamic(() => Promise.resolve(App), {
  ssr: false,
});
