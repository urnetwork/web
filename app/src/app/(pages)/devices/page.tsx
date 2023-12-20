async function getData() {
  const result = await fetch("https://api.bringyour.com/network/clients", {
    headers: {
      Authorization:
        "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJuZXR3b3JrX2lkIjoiMDE4YzdlODUtNjJkZC01MmI2LTM5OGEtOTQ0NjRmZjUwM2I3IiwibmV0d29ya19uYW1lIjoiYXdhaXN0ZXN0IiwidXNlcl9pZCI6IjAxOGM3ZTg1LTYyZGQtNTJiNi0zOThhLTk0NDVkYzJhZTNiYiJ9.aLp9tJ35AprU3BbbnAFyKJlr1GMrDb_dtYC2prggFK29SewzzKw3PYIcRJ0EZf60vGMYIjlDiDfICPXJXYCczyuvIflkM9KIFWplZwlGF1tCD6DHAG-cJXdU2f3hHPjMTYN7GltiZGiDnC4CfyyEZQUpXthQNKhzUYXO2AG1FTCbVIHjs5eBh4DP4RqQaav7G_f85UaAm56WyOFoC6HslLJ7d4_kz7hc8mCu2TxoeeyVBdrir8Mb8JZ2U-BwKpWYMwgjmhV5e3S8xP43MwtTdCUe95K6RbSh7633wEkjTIetVmUfh235jEE9uLhYsrDkKcYNTNhRBjA5piGeQcunQA",
    },
  });
  // const result = await fetch(
  //   "https://api.bringyour.com/network/provider-locations",
  //   {
  //     headers: {
  //       Authorization:
  //         "Bearer eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCJ9.eyJuZXR3b3JrX2lkIjoiMDE4YzdlODUtNjJkZC01MmI2LTM5OGEtOTQ0NjRmZjUwM2I3IiwibmV0d29ya19uYW1lIjoiYXdhaXN0ZXN0IiwidXNlcl9pZCI6IjAxOGM3ZTg1LTYyZGQtNTJiNi0zOThhLTk0NDVkYzJhZTNiYiJ9.aLp9tJ35AprU3BbbnAFyKJlr1GMrDb_dtYC2prggFK29SewzzKw3PYIcRJ0EZf60vGMYIjlDiDfICPXJXYCczyuvIflkM9KIFWplZwlGF1tCD6DHAG-cJXdU2f3hHPjMTYN7GltiZGiDnC4CfyyEZQUpXthQNKhzUYXO2AG1FTCbVIHjs5eBh4DP4RqQaav7G_f85UaAm56WyOFoC6HslLJ7d4_kz7hc8mCu2TxoeeyVBdrir8Mb8JZ2U-BwKpWYMwgjmhV5e3S8xP43MwtTdCUe95K6RbSh7633wEkjTIetVmUfh235jEE9uLhYsrDkKcYNTNhRBjA5piGeQcunQA",
  //     },
  //   }
  // );
  console.log(result);

  if (!result.ok) {
    throw new Error("Failed to fetch");
  }
  return result.json();
}

export default async function Page() {
  const data = await getData();
  console.log("Response: ", data);

  const clients = data.clients;

  return (
    <>
      <div className="mt-12 p-4">
        <h1>Your Devices</h1>

        {clients.map((client) => {
          return <p key={client.client_id}>{client.client_id}</p>;
        })}
      </div>
    </>
  );
}
