import { config } from '../config'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-800 py-8">
      <div className="mx-auto max-w-6xl space-y-2 px-4 text-xs text-slate-500">
        <p>
          <strong className="text-slate-300">Privacy:</strong> FileTools processes every file
          locally in your browser using web APIs. Your files are never uploaded, transmitted,
          or stored on any server.
        </p>
        <p>
          {config.appName} v{config.version} · Free &amp; Premium plans · No account required ·{' '}
          <a
            href="https://github.com/KElvin1586/filetools"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-400 hover:underline"
          >
            Source on GitHub
          </a>
        </p>
      </div>
    </footer>
  )
}
