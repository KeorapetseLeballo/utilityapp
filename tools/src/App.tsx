import { SkillsUploadSection } from "./components/SkillsUploadSection";

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <p className="app-eyebrow">Cursor utilities</p>
          <h1>Utilities App</h1>
          <p className="app-subtitle">
            Upload and inspect Cursor Agent Skill files before adding them to your
            skills directory.
          </p>
        </div>
      </header>

      <main className="app-main">
        <SkillsUploadSection />
      </main>
    </div>
  );
}
