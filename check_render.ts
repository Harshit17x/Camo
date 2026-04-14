import axios from "axios";

async function check() {
  const res = await axios.get("https://campusmobility-9kz2.onrender.com/");
  const match = res.data.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (match) {
    const jsUrl = "https://campusmobility-9kz2.onrender.com" + match[1];
    const jsRes = await axios.get(jsUrl);
    if (jsRes.data.includes("Failed to send:")) {
      console.log("RENDER HAS LATEST CODE");
    } else {
      console.log("RENDER HAS OLD CODE");
    }
  } else {
    console.log("Could not find JS bundle");
  }
}
check().catch(console.error);
