/* Static jsDelivr-friendly client. The password is never stored here. */
let socket, loggedIn = false, lastMove = 0;
const $ = (id) => document.getElementById(id);
const setStatus = (message, live = false) => { $("status").textContent = message; document.querySelector(".dot").classList.toggle("live", live); };

$("connect").onclick = () => {
  const host = $("host").value.trim().replace(/\/$/, "");
  if (!host) return setStatus("Enter the host address first.");
  if (socket) socket.disconnect();
  setStatus("Connecting…");
  socket = io(host, { transports: ["websocket"] });
  socket.on("connect", () => socket.emit("login", { password: $("password").value }));
  socket.on("connect_error", () => setStatus("Could not reach that host."));
  socket.on("login_result", (result) => {
    if (!result.ok) return setStatus(result.message);
    loggedIn = true; $("connect-card").hidden = true; $("remote").hidden = false; setStatus(result.message, true);
  });
  socket.on("monitors", (screens) => {
    $("monitor").innerHTML = screens.map((screen) => `<option value="${screen.id}">${screen.name} — ${screen.width} × ${screen.height}</option>`).join("");
  });
  socket.on("frame", (frame) => { $("screen").src = `data:image/jpeg;base64,${frame.jpeg}`; });
  socket.on("disconnect", () => { if (loggedIn) setStatus("Disconnected"); loggedIn = false; });
};
$("disconnect").onclick = () => { if (socket) socket.disconnect(); $("remote").hidden = true; $("connect-card").hidden = false; };
$("monitor").onchange = (event) => socket.emit("select_monitor", { monitor: Number(event.target.value) });

function point(event) {
  const box = $("screen").getBoundingClientRect();
  return { x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)) };
}
$("screen").addEventListener("mousemove", (event) => { if (loggedIn && Date.now() - lastMove > 30) { lastMove = Date.now(); socket.emit("pointer", { ...point(event), action: "move" }); } });
$("screen").addEventListener("contextmenu", (event) => { event.preventDefault(); if (loggedIn) socket.emit("pointer", { ...point(event), action: "click", button: "right" }); });
$("screen").addEventListener("click", (event) => { if (loggedIn) socket.emit("pointer", { ...point(event), action: "click", button: event.button === 2 ? "right" : "left" }); });
$("screen").addEventListener("dblclick", (event) => { if (loggedIn) socket.emit("pointer", { ...point(event), action: "double", button: "left" }); });
$("screen").addEventListener("wheel", (event) => { if (loggedIn) { event.preventDefault(); socket.emit("scroll", { amount: event.deltaY > 0 ? -3 : 3 }); } }, { passive: false });
window.addEventListener("keydown", (event) => { if (!loggedIn || document.activeElement.tagName === "INPUT") return; event.preventDefault(); socket.emit("key", { key: event.key, ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey, meta: event.metaKey }); });
