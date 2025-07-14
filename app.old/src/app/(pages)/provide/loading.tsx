export default function Loading() {
  return (
    <>
      <div className="md:mt-12 p-4 max-w-5xl">
        <div className="flex flex-col gap-y-16">
          <div className="flex flex-row w-full gap-2">
            {Array(5)
              .fill(0)
              .map((item, index) => (
                <div
                  key={`gray-box-${index}`}
                  className="w-1/5 bg-gray-100 rounded-md h-20"
                />
              ))}
          </div>
          <div className="w-full rounded-md bg-gray-100 h-64" />
        </div>
      </div>
    </>
  );
}
