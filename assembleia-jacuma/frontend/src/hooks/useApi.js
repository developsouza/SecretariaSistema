import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export function useApi(endpoint, options = {}) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    async function buscar() {
      try {
        setCarregando(true);
        setErro(null);
        const res = await fetch(`${API_BASE}${endpoint}`, {
          signal: controller.signal,
          ...options
        });
        const json = await res.json();
        if (json.sucesso) {
          setDados(json.dados);
        } else {
          setErro(json.erro || 'Erro ao carregar dados');
        }
      } catch (e) {
        if (e.name !== 'AbortError') {
          setErro(e.message);
        }
      } finally {
        setCarregando(false);
      }
    }

    buscar();
    return () => controller.abort();
  }, [endpoint]);

  return { dados, carregando, erro };
}

export async function postApi(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}
