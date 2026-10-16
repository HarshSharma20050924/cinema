const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf-8');

const addProviderLogic = `
      const addProvider = () => {
        const key = prompt('Enter provider key (e.g., myProvider):');
        if (!key) return;
        const name = prompt('Enter provider name (e.g., My Provider):');
        if (!name) return;
        setProviders(prev => ({
          ...prev,
          [key]: { name, enabled: true, baseUrl: '' }
        }));
      };
`;

html = html.replace(
`      const updateProvider = (key, field, value) => {`,
addProviderLogic + `\n      const updateProvider = (key, field, value) => {`
);

const addProviderUI = `
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 28px',
                      borderRadius: '999px',
                      background: '#e50914',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(229, 9, 20, 0.3)',
                    }}
                  >
                    Save Changes
                  </button>
                  
                  <button
                    type="button"
                    onClick={addProvider}
                    style={{
                      padding: '12px 28px',
                      borderRadius: '999px',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    + Add Provider
                  </button>

                  {saveSuccess && (
`;

html = html.replace(
`                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <button
                    type="submit"
                    style={{
                      padding: '12px 28px',
                      borderRadius: '999px',
                      background: '#e50914',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 16px rgba(229, 9, 20, 0.3)',
                    }}
                  >
                    Save Changes
                  </button>

                  {saveSuccess && (`,
addProviderUI
);

fs.writeFileSync('public/index.html', html, 'utf-8');
console.log('index.html updated with Add Provider');
