export default function Loading() {
  return (
    <>
      <div className="flex flex-row gap-4 flex-wrap">
        {Array(4)
          .fill(0)
          .map(() => (
            <div className="bg-gray-200 rounded-md w-40 h-96" />
          ))}
      </div>
    </>
  );
}
