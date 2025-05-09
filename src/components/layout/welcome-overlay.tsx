
'use client';

import type { FC } from 'react';
import { Button } from '@/components/ui/button';

interface WelcomeOverlayProps {
  onStart: () => void;
}

const WelcomeOverlay: FC<WelcomeOverlayProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="text-center">
        <h1 className="text-6xl sm:text-7xl font-bold text-primary mb-4 animate-fade-in-down">
          VisionAI
        </h1>
        <p className="text-muted-foreground mb-10 text-lg animate-fade-in-up animation-delay-300 max-w-xl px-4">
          AI yang bisa berinteraksi melalui kamera secara real time yang dikembangkan oleh Farqonzero.def dengan menggunakan model AI/ML Gemini 2.5 flash
        </p>
        <Button
          size="lg"
          onClick={onStart}
          className="animate-fade-in-up animation-delay-600 text-lg px-8 py-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
          aria-label="Mulai Aplikasi VisionAI"
        >
          Mulai
        </Button>
      </div>
      <style jsx>{`
        @keyframes fade-in-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.8s ease-out forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        .animation-delay-300 {
          animation-delay: 0.3s;
        }
        .animation-delay-600 {
          animation-delay: 0.6s;
        }
        /* Ensure elements are invisible until animation starts */
        .animate-fade-in-down, .animate-fade-in-up {
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default WelcomeOverlay;

