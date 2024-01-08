import { Provider } from "@/app/_lib/types";

type DevicesTableProps = {
  providers: Provider[];
};

export default function DevicesTable({ providers }: DevicesTableProps) {
  return (
    <>
      <div className="overflow-x-auto w-full">
        <table className="w-full divide-y divide-gray-300">
          <thead>
            <tr className="text-left text-xs font-light text-gray-500">
              <th scope="col" className="py-3 px-1" />
              <th scope="col" className="py-3 px-1" />
              <th scope="col" className="py-3 px-1">
                Data transferred
              </th>
              <th scope="col" className="py-3 px-1">
                Income
              </th>
              <th scope="col" className="py-3 px-1">
                Uptime
              </th>
              <th scope="col" className="py-3 px-1">
                Search interest
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {providers?.map((provider) => (
              <tr
                key={`device-row-${provider.client_id}`}
                className="whitespace-nowrap text-sm text-gray-800 cursor-pointer hover:bg-gray-100"
              >
                <td className="py-2 px-1 font-semibold text-gray-800">
                  {provider.client_id}
                </td>
                <td className="py-2 px-1">
                  {provider.clients_last_24h}
                  <span className="text-xs">{" connections"}</span>
                </td>
                <td className="py-2 px-1">
                  {provider.transfer_data_last_24h}{" "}
                  <span className="text-xs">GiB</span>
                </td>
                <td className="py-2 px-1">${provider.payout_last_24h}</td>
                <td className="py-2 px-1">
                  <div className="h-4 w-32 bg-primary"></div>
                </td>
                <td className="py-2 px-1">
                  {provider.search_interest_last_24h}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
