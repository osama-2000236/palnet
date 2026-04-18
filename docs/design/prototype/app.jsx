/* global React, AppShell, FeedPage, ProfilePage, NetworkPage, MessagesPage, SearchPage */
function App() {
  const [screen, setScreen] = React.useState(() => localStorage.getItem("palnet.screen") || "feed");
  const [profileId, setProfileId] = React.useState(null);

  React.useEffect(() => { localStorage.setItem("palnet.screen", screen); }, [screen]);

  function navigate(key) { setScreen(key); if (key !== "profile") setProfileId(null); }
  function openProfile(id) { setProfileId(id); setScreen("profile"); }

  let page;
  if (screen === "feed") page = <FeedPage onNavigate={navigate} onOpenProfile={openProfile}/>;
  else if (screen === "profile") page = <ProfilePage userId={profileId} onNavigate={navigate}/>;
  else if (screen === "network") page = <NetworkPage onOpenProfile={openProfile}/>;
  else if (screen === "messages") page = <MessagesPage/>;
  else if (screen === "search") page = <SearchPage onOpenProfile={openProfile}/>;
  else if (screen === "jobs") page = <Placeholder title="الوظائف" subtitle="سيأتي في Sprint 5"/>;
  else if (screen === "notifications") page = <Placeholder title="الإشعارات" subtitle="قيد التصميم"/>;
  else page = <FeedPage onNavigate={navigate} onOpenProfile={openProfile}/>;

  return <AppShell current={screen} onNavigate={navigate}>{page}</AppShell>;
}

function Placeholder({ title, subtitle }) {
  return (
    <div style={{ maxWidth: 600, margin: "80px auto", padding: 40, textAlign: "center" }}>
      <div className="display" style={{ marginBottom: 8 }}>{title}</div>
      <div className="body text-muted">{subtitle}</div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);
