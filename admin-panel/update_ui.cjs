const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf-8');

// Replace buzzwords
html = html.replace('<title>Cinema Console — Network & Cluster Manager</title>', '<title>Admin Panel</title>');

html = html.replace(
`              <h2 style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '6px' }}>
                Cinema Console
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
                Enter master credentials to access cluster nodes and configuration.
              </p>`,
`              <h2 style={{ fontSize: '19px', fontWeight: 800, letterSpacing: '-0.3px', marginBottom: '6px' }}>
                Admin Panel
              </h2>
              <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>
                Login to access admin dashboard.
              </p>`);

html = html.replace(
`                  <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px' }}>
                    Cinema Console
                  </h1>
                  <span style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#cbd5e1',
                    fontWeight: 700,
                  }}>
                    Multi-Server Cluster
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Central Node Coordinator & Failover Engine
                </div>`,
`                  <h1 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px' }}>
                    Admin Panel
                  </h1>
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                  Manage connected devices and settings
                </div>`);

html = html.replace(
`                <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  {settings.serverEnabled
                    ? (activeCount > 0 ? \`\${activeCount} Node\${activeCount > 1 ? 's' : ''} Active in Pool\` : 'Standby / Waiting for Nodes')
                    : 'Network Disabled by Master Switch'}
                </span>`,
`                <span style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                  {settings.serverEnabled
                    ? (activeCount > 0 ? \`\${activeCount} Device\${activeCount > 1 ? 's' : ''} Connected\` : 'Waiting for Devices')
                    : 'System Disabled Globally'}
                </span>`);

html = html.replace(`<span>{settings.serverEnabled ? 'Global Killswitch' : 'Enable Network'}</span>`, `<span>{settings.serverEnabled ? 'Disable System' : 'Enable System'}</span>`);
html = html.replace(`<span>Registered Devices ({devices.length})</span>`, `<span>Devices ({devices.length})</span>`);
html = html.replace(`<span>Scraper Settings</span>`, `<span>Provider Settings</span>`);

html = html.replace(`Launch the runner app on any phone and click Start. The device will register here automatically for cluster load-balancing and failover.`, `Launch the runner app on any phone and click Start. The device will register here automatically.`);

// Update Providers logic to map over dynamic object instead of hardcoded
html = html.replace(
`      const [scraperUrl, setScraperUrl] = useState('');
      const [scraperTimeout, setScraperTimeout] = useState(4000);
      const [scraperUserAgent, setScraperUserAgent] = useState('');
      const [autoEmbedUrl, setAutoEmbedUrl] = useState('');`,
``);

html = html.replace(
`          setScraperUrl(data.gramcinema?.baseUrl || '');
          setScraperTimeout(data.gramcinema?.searchTimeoutMs || 4000);
          setScraperUserAgent(data.gramcinema?.headers?.['User-Agent'] || '');
          setAutoEmbedUrl(data.autoEmbed?.baseUrl || '');`,
``);

html = html.replace(
`      // Save Providers
      const saveProviders = async (e) => {
        e.preventDefault();
        const updated = {
          ...providers,
          gramcinema: {
            ...providers.gramcinema,
            name: 'Primary Scraper',
            baseUrl: scraperUrl,
            searchTimeoutMs: Number(scraperTimeout) || 4000,
            headers: {
              ...providers.gramcinema?.headers,
              'User-Agent': scraperUserAgent,
            }
          },
          autoEmbed: {
            ...providers.autoEmbed,
            baseUrl: autoEmbedUrl,
          }
        };

        const res = await fetch('/api/admin/providers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`,
          },
          body: JSON.stringify(updated),
        });

        if (res.ok) {
          setProviders(updated);
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      };`,
`      // Save Providers
      const saveProviders = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/admin/providers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': \`Bearer \${token}\`,
          },
          body: JSON.stringify(providers),
        });

        if (res.ok) {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        }
      };
      
      const updateProvider = (key, field, value) => {
        setProviders(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            [field]: value
          }
        }));
      };
`);

const formReplacement = `
              <form onSubmit={saveProviders}>
                {Object.entries(providers).map(([key, provider]) => (
                  <div key={key} style={{ marginBottom: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>{provider.name || key}</h4>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                        <input type="checkbox" checked={provider.enabled !== false} onChange={(e) => updateProvider(key, 'enabled', e.target.checked)} />
                        Enabled
                      </label>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '4px' }}>Base URL</label>
                      <input
                        type="text"
                        value={provider.baseUrl || ''}
                        onChange={(e) => updateProvider(key, 'baseUrl', e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '13px' }}
                      />
                    </div>
                  </div>
                ))}
                
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

                  {saveSuccess && (
                    <span style={{ fontSize: '13px', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Icons.Check />
                      <span>Configuration updated</span>
                    </span>
                  )}
                </div>
              </form>
`;

html = html.replace(/<form onSubmit={saveProviders}>[\s\S]*?<\/form>/, formReplacement);
html = html.replace(/<div class="ambient-glow"><\/div>/, '');

fs.writeFileSync('public/index.html', html, 'utf-8');
console.log('index.html updated successfully.');
