"use client"

import { useEffect } from "react";
import { Render3JS } from "@/lib/render";

export default function Home() {
  useEffect(() => {
    const render = new Render3JS();
    render.start();
  }, []);

  return (
    <div>

    </div>
  );
}
