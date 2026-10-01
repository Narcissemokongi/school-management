// src/lib/pdfWorker.js
import { pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// ✨ Configuration du worker pour Vite
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;