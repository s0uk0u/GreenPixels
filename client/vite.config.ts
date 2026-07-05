import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    // host: true → écoute sur 0.0.0.0, indispensable pour que Docker Desktop
    // puisse relayer le port vers le navigateur côté Windows.
    host: true,
    port: 5173,
    strictPort: true,
    // Le polling coûte un peu de CPU mais évite que le hot-reload reste muet :
    // les événements inotify ne traversent pas toujours correctement la
    // virtualisation de fichiers de Docker Desktop sur Windows.
    watch: {
      usePolling: true,
    },
  },
});

