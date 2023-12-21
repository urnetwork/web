import Link from "next/link";

export default function Page() {
  return (
    <>
      <div className="max-w-lg mx-auto mt-24 text-center">
        <h1>You&apos;re not logged in</h1>
        <Link href="https://bringyour.com">
          <button className="button btn-primary mt-6">Log in here</button>
        </Link>
      </div>
    </>
  );
}
