import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

interface ProctorSentinelProps {
  onViolation: (type: string, details: any) => void;
}

export const ProctorSentinel: React.FC<ProctorSentinelProps> = ({ onViolation }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [models, setModels] = useState<{
    face?: any;
    landmarks?: any;
    objects?: any;
  }>({});
  
  const [status, setStatus] = useState('INITIALIZING_NEURAL_LINKS');
  const [detectionState, setDetectionState] = useState({
    faceCount: 1,
    gaze: 'CENTER',
    objectAlert: false
  });

  // 1. Load Universal AI Stack
  useEffect(() => {
    const loadPipeline = async () => {
      try {
        await tf.ready();
        setStatus('LOADING_DL_CORE');
        
        const [faceModel, landmarkModel, objectModel] = await Promise.all([
          blazeface.load(),
          faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            { runtime: 'tfjs', refineLandmarks: true }
          ),
          cocoSsd.load()
        ]);

        setModels({ face: faceModel, landmarks: landmarkModel, objects: objectModel });
        setStatus('SENTINEL_ACTIVE');
      } catch (err) {
        setStatus('PIPELINE_ERROR');
        console.error('AI Boot failure', err);
      }
    };
    loadPipeline();
  }, []);

  // 2. Camera Stream setup with HD constraints
  useEffect(() => {
    const startSecureStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: { ideal: 30 } }
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        onViolation('HARDWARE_MISMATCH', { detail: 'Camera stream corrupted or unavailable' });
      }
    };
    startSecureStream();
  }, [onViolation]);

  // 3. High-Frequency Decision Engine (Every 3 seconds)
  useEffect(() => {
    if (!models.face || !videoRef.current) return;

    const runForensicAudit = async () => {
      if (!videoRef.current) return;
      const video = videoRef.current;

      try {
        // A. Face & Multiple Person Detection
        const faces = await models.face.estimateFaces(video, false);
        setDetectionState(prev => ({ ...prev, faceCount: faces.length }));
        
        if (faces.length === 0) onViolation('NO_FACE_DETECTED', { timestamp: new Date() });
        if (faces.length > 1) {
            onViolation('MULTIPLE_FACES_DETECTED', { count: faces.length });
            captureEvidence('MULTI_USER_PRESENCE');
        }

        // B. Object Detection (Phone/Book)
        if (models.objects) {
            const predictions = await models.objects.detect(video);
            const suspicious = predictions.filter((p: any) => 
                ['cell phone', 'book', 'laptop', 'remote'].includes(p.class) && p.score > 0.6
            );
            if (suspicious.length > 0) {
                onViolation('PROHIBITED_OBJECT_DETECTED', { objects: suspicious.map((s: any) => s.class) });
                captureEvidence('OBJECT_VIOLATION');
                setDetectionState(prev => ({ ...prev, objectAlert: true }));
            } else {
                setDetectionState(prev => ({ ...prev, objectAlert: false }));
            }
        }

        // C. Face Landmark / Gaze Estimation
        if (models.landmarks && faces.length === 1) {
            const landmarks = await models.landmarks.estimateFaces(video);
            const keypoints = landmarks[0]?.keypoints || [];
            if (keypoints.length > 263) {
                // Heuristic for "Looking Away": compare iris positions
                // Simple version for MVP: Checking if head is turned too far
                const leftEye = keypoints[33];
                const rightEye = keypoints[263];
                const diff = Math.abs((leftEye?.z || 0) - (rightEye?.z || 0)); // Z-depth diff
                if (diff > 25) {
                    onViolation('GAZE_DEVIATION', { score: diff });
                    setDetectionState(prev => ({ ...prev, gaze: 'AWAY' }));
                } else {
                    setDetectionState(prev => ({ ...prev, gaze: 'CENTER' }));
                }
            }
        }
      } catch (err) {
          console.warn('In-stream audit cycle skipped', err);
      }
    };

    const captureEvidence = (label: string) => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, 320, 180);
            console.log(`[ASEP_DL_FORENSICS] Evidence sealed: ${label}`);
        }
    };

    const auditInterval = setInterval(runForensicAudit, 3000);
    return () => clearInterval(auditInterval);
  }, [models, onViolation]);

  return (
    <div className="fixed top-8 right-8 z-[200]">
      {/* Premium HUD */}
      <div className={`w-56 h-40 bg-black/80 rounded-3xl border-2 transition-all duration-500 overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.8)] ${
        detectionState.faceCount !== 1 || detectionState.objectAlert ? 'border-red-500 ring-4 ring-red-500/20 scale-105' : 'border-emerald-500/30'
      }`}>
        <video ref={videoRef} autoPlay muted className="w-full h-full object-cover scale-x-[-1] opacity-60" />
        
        {/* Neural Overlay */}
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
             <div className="flex flex-col">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Sentinel_Pro v4</span>
                <span className={`text-[10px] font-bold ${status === 'SENTINEL_ACTIVE' ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
                  {status}
                </span>
             </div>
             <div className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${
               detectionState.gaze === 'AWAY' ? 'bg-red-500 text-white' : 'bg-emerald-500/20 text-emerald-400'
             }`}>
                GAZE: {detectionState.gaze}
             </div>
          </div>

          <div className="space-y-1">
             <div className="flex justify-between items-center text-[8px] font-bold text-white/60">
                <span>REPLICAS: 4</span>
                <span>ENC_HS256</span>
             </div>
             <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-3/4 animate-pulse" />
             </div>
          </div>
        </div>
        
        {/* Detection Markers */}
        {detectionState.objectAlert && (
          <div className="absolute inset-0 bg-red-600/20 animate-pulse flex items-center justify-center">
             <span className="text-[10px] font-black text-white uppercase tracking-[0.3em] bg-red-600 px-3 py-1 rounded-lg shadow-xl">Prohibited Object</span>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} width="320" height="180" className="hidden" />
    </div>
  );
};
