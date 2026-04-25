import { useState, useEffect, useCallback } from 'react';

const BACKEND_HOST = import.meta.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = import.meta.env.BACKEND_PORT || '5000';
const P2P_API = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

const useFilePeer = () => {
  const [peers, setPeers] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [stats, setStats] = useState({ percent: 0, status: 'idle' });

  // Feature 1: Discover peers on the LAN
  const fetchPeers = useCallback(async () => {
    try {
      const res = await fetch(`${P2P_API}/peers`);
      if (res.ok) {
        const data = await res.json();
        setPeers(data);
      }
    } catch (e) {
      console.warn('[P2P] Peer discovery failed. Ensure backend is running.');
    }
  }, []);

  useEffect(() => {
    fetchPeers();
    const interval = setInterval(fetchPeers, 5000);
    return () => clearInterval(interval);
  }, [fetchPeers]);

  // Feature 2: Handle file dispatch to a selected peer
  const handleSend = async (peer) => {
    if (!selectedFile) return;

    setStats({ percent: 0, status: 'negotiating' });

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // We manually start progress polling here because the backend 
      // already tracks the Relay task once it receives the stream.
      // In this setup, we'll let the single POST handle its own completion.
      
      const res = await fetch(`${P2P_API}/relay-push/${peer.ip}/${peer.port}`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setStats({ percent: 100, status: 'completed' });
        setTimeout(() => setStats({ percent: 0, status: 'idle' }), 3000);
      } else {
        setStats({ percent: 0, status: 'error' });
      }
    } catch (e) {
      console.error('[P2P] Dispatch failed:', e);
      setStats({ percent: 0, status: 'error' });
    }
  };

  return { peers, selectedFile, setSelectedFile, stats, handleSend };
};

export default useFilePeer;
