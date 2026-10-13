# Contributing to Cinema

Thank you for your interest in contributing to Cinema. This document outlines the process for proposing changes, reporting issues, and submitting code to the project.

---

## Code of Conduct

All contributors and participants are expected to maintain a welcoming, respectful, and professional environment. Focus on constructive feedback and collaboration.

---

## How to Report Bugs

If you find a bug, please check the [GitHub Issues](https://github.com/HarshSharma20050924/cinema/issues) tab first to see if it has already been reported.

When opening a new issue:
1. Provide a clear and descriptive title.
2. Describe the exact steps to reproduce the issue.
3. Include your environment details (Operating system, browser/app version, device model).
4. Include relevant log output or screenshots if applicable.

---

## How to Suggest Features

Feature suggestions and provider additions are welcome:
1. Open an issue with the tag `enhancement`.
2. Explain the use case and why the feature is helpful.
3. Outline how the feature should behave.

---

## Local Development Workflow

### 1. Fork and Clone

```bash
git clone https://github.com/HarshSharma20050924/cinema.git
cd cinema
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Install Dependencies

```bash
# Main web application
npm install

# Backend scraper server
cd server && npm install && cd ..

# Desktop application (optional)
cd desktop-app && npm install && cd ..

# Desktop runner daemon (optional)
cd desktop-runner && npm install && cd ..
```

### 4. Code Standards

* Use TypeScript for web components and React applications.
* Keep styling cohesive with the obsidian black (`#000000`, `#0e0e11`, `#e50914`) design system.
* Do not use emojis in commit messages or code comments.
* Avoid marketing buzzwords; write clean and understandable code.
* Run the build check before submitting changes:
  ```bash
  npm run build
  ```

---

## Submitting Pull Requests

1. Commit your changes with clear, descriptive commit messages:
   ```bash
   git commit -m "Add new catalog filter for documentary niche"
   ```
2. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```
3. Open a Pull Request against the `main` branch.
4. Describe your changes clearly in the pull request description.
5. Ensure all continuous integration checks pass.

---

## Contact & Questions

If you have questions about contributing or need guidance:
* Author: Harsh Sharma
* Email: harsh20050924@gmail.com
* GitHub: https://github.com/HarshSharma20050924
