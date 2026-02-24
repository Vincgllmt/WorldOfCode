export default function UploadTest() {
  const imageUrl =
    "http://localhost:9000/uploads/1764000646-codepen.png"; // ← Mets l’URL que ton backend t’a renvoyée

  return (
    <div style={{ padding: "40px" }}>
      <h1>Test image MinIO</h1>
      <p>Voici l’image récupérée depuis MinIO :</p>

      <img
        src={imageUrl}
        alt="test"
        style={{
          width: "300px",
          border: "2px solid #222",
          borderRadius: "8px",
          marginTop: "20px",
        }}
      />
    </div>
  );
}
