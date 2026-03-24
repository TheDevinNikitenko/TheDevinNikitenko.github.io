// upload.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

// --- Supabase config ---
const supabaseUrl = "https://mhdnkndhrlrihpyshrfi.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZG5rbmRocmxyaWhweXNocmZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQxNjk3NCwiZXhwIjoyMDg4OTkyOTc0fQ.Ep109kZofSXLpDrQ0NmHzuSMpGq0S7PbabrKL7RgWEw" // IMPORTANT: never expose service role keys in frontend
const BUCKET = "leaks"

const supabase = createClient(supabaseUrl, supabaseKey)

// --- Global variables ---
let pastedImage = null

// --- Helpers ---
function generateFileName(file) {
  const ext = file.name.split(".").pop()
  const unique = Date.now() + "-" + crypto.randomUUID()
  return `${unique}.${ext}`
}

// Preview helper
function setPreview(file) {
  const preview = document.getElementById("preview")
  if (!preview) return

  if (!file) {
    preview.src = ""
    return
  }

  preview.src = URL.createObjectURL(file)
}

// --- Upload Function ---
async function uploadLeak(file) {

  const status = document.getElementById("leakStatus")

  const title = document.getElementById("leakTitle").value || "Untitled"
  const description = document.getElementById("leakDescription").value || ""
  const from_who = document.getElementById("leakFrom_who").value || ""

  const fileName = generateFileName(file)

  status.innerText = "Uploading..."

  try {

    // Upload image
    const { error: uploadError } = await supabase
      .storage
      .from(BUCKET)
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Insert metadata
    const { error: dbError } = await supabase
      .from("leaks")
      .insert([{
        title,
        description,
        from_who,
        photo: fileName
      }])

    if (dbError) throw dbError

    status.innerText = "Upload successful!"

    // reset
    document.getElementById("leakUploadForm").reset()
    pastedImage = null
    setPreview(null)

    const leakModal = document.getElementById("leakModal")
    if (leakModal) leakModal.style.display = "none"

    await loadLeaks()

  } catch (err) {

    console.error(err)
    status.innerText = "Upload failed"

  }

}

// --- Paste handler (AUTO UPLOAD) ---
document.addEventListener("paste", async (event) => {

  const items = event.clipboardData?.items
  if (!items) return

  for (let item of items) {

    if (item.type.startsWith("image/")) {

      const blob = item.getAsFile()

      pastedImage = new File(
        [blob],
        `pasted-${Date.now()}.png`,
        { type: blob.type }
      )

      console.log("Image pasted!")

      setPreview(pastedImage)

      const status = document.getElementById("leakStatus")
      if (status) status.innerText = "Uploading pasted screenshot..."

      // auto upload
      await uploadLeak(pastedImage)

      break
    }
  }

})

// --- Load leaks list ---
async function loadLeaks() {

  const leakList = document.getElementById("leakList")
  if (!leakList) return

  leakList.innerHTML = "Loading..."

  const { data, error } = await supabase
    .from("leaks")
    .select("*")
    .order("uploaded_at", { ascending: false })

  if (error) {
    console.error(error)
    leakList.innerHTML = "Failed to load leaks"
    return
  }

  leakList.innerHTML = ""

  data.forEach((leak) => {

    let imageUrl

    if (leak.photo.startsWith("http")) {
      imageUrl = leak.photo
    } else {
      const { data: urlData } = supabase
        .storage
        .from(BUCKET)
        .getPublicUrl(leak.photo)

      imageUrl = urlData.publicUrl
    }

    const item = document.createElement("div")
    item.className = "leak-item"
    item.style.marginBottom = "20px"

    item.innerHTML = `
      <img src="${imageUrl}" style="max-width:100%; display:block; margin-bottom:5px;">
      <h3 style="margin:0">${leak.title}</h3>
      <p style="margin:0">${leak.description || ""}</p>
      <small>From: ${leak.from_who}</small><br>
      <small>Uploaded: ${new Date(leak.uploaded_at).toLocaleString()}</small>
      <hr>
    `

    leakList.appendChild(item)

  })

}

// --- Upload form handler ---
const form = document.getElementById("leakUploadForm")

form.addEventListener("submit", async (e) => {

  e.preventDefault()

  const fileInput = document.getElementById("leakPhoto")
  const file = fileInput.files[0] || pastedImage

  if (!file) {
    document.getElementById("leakStatus").innerText =
      "Select a file or paste a screenshot first."
    return
  }

  await uploadLeak(file)

})

// --- Load leaks on page start ---
loadLeaks()