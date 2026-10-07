import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';

interface WireGuardQRModalProps {
  config: string;
  onClose: () => void;
}

export default function WireGuardQRModal({ config, onClose }: WireGuardQRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, config, {
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(() => setError(true));
  }, [config]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ur-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-ur-panel rounded-ur shadow-ur-flat border border-ur-border p-6 w-full max-w-sm mx-4 flex flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-ur-blue-light">
            <Smartphone size={18} />
            <span className="font-semibold text-sm">Scan with WireGuard App</span>
          </div>
          <button
            onClick={onClose}
            className="text-ur-gray hover:text-ur-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="bg-white p-3 rounded-lg shadow-inner">
          {error ? (
            <div className="w-[280px] h-[280px] flex items-center justify-center text-ur-coral text-sm text-center px-4">
              Failed to generate QR code. Config may be too large.
            </div>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>

        <p className="text-xs text-ur-gray text-center leading-relaxed">
          Open the WireGuard app on your phone, tap the <strong className="text-ur-gray">+</strong> button, then choose{' '}
          <strong className="text-ur-gray">Scan from QR Code</strong>.
        </p>
        <p className="text-xs text-ur-coral/80 text-center">
          Keep this QR code private — it contains your private key.
        </p>
      </div>
    </div>,
    document.body
  );
}
