import Tfr from "./components/Tfr";

import "./App.css";

function App() {
  return (
    <>
      <div className="header">
        <h1>voglioinvestireda.me</h1>
      </div>
      <div className="content">
        <Tfr />
      </div>
      <p className="cta">
        <a className="btn" href="https://www.paypal.com/donate/?hosted_button_id=GATC5UXGKZXKL">
          Offrimi una birra 🍺
        </a>
      </p>
      <div className="footer">
        <p>&copy; 2025 Enrico Ceron</p>

        <p>
          <a href="https://linkedin.com/in/enricoceron">LinkedIn</a>
        </p>
      </div>
    </>
  );
}

export default App;
