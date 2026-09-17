import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/flashcards", label: "Flashcards" },
  { to: "/quizzes", label: "Quizzes" },
  { to: "/summaries", label: "Summaries" },
  { to: "/search", label: "Search" },
  { to: "/progress", label: "Progress" },
];

export function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-brand">Medicine</div>
      <nav className="navbar-links">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
