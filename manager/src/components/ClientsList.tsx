import React from "react";
import { ChevronDown, ChevronRight, Smartphone } from "lucide-react";
import type { Client } from "../services/api";
import ClientCard from "./ClientCard";

interface ClientsListProps {
	clients: Client[];
	onClientRemoved: (clientId: string) => void;
}

interface ClientGroup {
	sourceClient: Client;
	childClients: Client[];
}

const ClientsList: React.FC<ClientsListProps> = ({
	clients,
	onClientRemoved,
}) => {
	const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
		new Set(),
	);

	const groupClients = (): {
		groups: ClientGroup[];
		standaloneClients: Client[];
	} => {
		const clientsById = new Map<string, Client>();

		for (const client of clients) {
			clientsById.set(client.client_id, client);
		}

		const clientsGrouped = new Map<string, Client[]>();
		const standaloneClients = new Set<Client>();

		for (const client of clients) {
			if (client.source_client_id) {
				const existingEntries = clientsGrouped.get(
					client.source_client_id,
				);
				const entry = existingEntries ?? [];
				entry.push(client);

				if (!existingEntries) {
					clientsGrouped.set(client.source_client_id, entry);
				}
			} else {
				standaloneClients.add(client);
			}
		}

		const groups: ClientGroup[] = [];

		for (const [parentId, clients] of clientsGrouped) {
			const parent = clientsById.get(parentId);

			if (!parent) {
				for (const client of clients) {
					standaloneClients.add(client);
				}
			} else {
				groups.push({
					sourceClient: parent,
					childClients: clients,
				});
			}
		}

		return {
			groups,
			standaloneClients: [...standaloneClients.values()].filter(
				(client) => !clientsGrouped.has(client.client_id),
			),
		};
	};

	const { groups, standaloneClients } = groupClients();

	const toggleGroup = (sourceClientId: string) => {
		const newExpanded = new Set(expandedGroups);
		if (newExpanded.has(sourceClientId)) {
			newExpanded.delete(sourceClientId);
		} else {
			newExpanded.add(sourceClientId);
		}
		setExpandedGroups(newExpanded);
	};

	if (clients.length === 0) {
		return (
			<div className="bg-ur-panel rounded-ur shadow-ur-flat p-8 text-center border border-ur-border">
				<div className="max-w-md mx-auto">
					<div className="w-16 h-16 bg-ur-raised rounded-full flex items-center justify-center mx-auto mb-4">
						<span className="text-2xl">🔍</span>
					</div>
					<h3 className="text-lg font-medium text-ur-white mb-2">
						No Clients Found
					</h3>
					<p className="text-ur-gray italic">
						Try refreshing the list or check your network
						connection.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Client Groups */}
			{groups.map((group) => {
				const isExpanded = expandedGroups.has(
					group.sourceClient.client_id,
				);
				const totalClients = 1 + group.childClients.length;
				const connectedCount = [
					group.sourceClient,
					...group.childClients,
				].filter(
					(c) => c.connections && c.connections.length > 0,
				).length;

				return (
					<div
						key={group.sourceClient.client_id}
						className="bg-ur-panel rounded-ur shadow-ur-flat border border-ur-border"
					>
						{/* Group Header */}
						<div
							className={`p-4 ${isExpanded ? "rounded-t-xl" : "rounded-ur"} bg-ur-raised border-b border-ur-border cursor-pointer hover:bg-ur-hover`}
							onClick={() =>
								toggleGroup(group.sourceClient.client_id)
							}
						>
							<div className="flex items-center justify-between gap-4">
								<div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
									<div className="flex items-center gap-2">
										{isExpanded ? (
											<ChevronDown
												size={20}
												className="text-ur-gray"
											/>
										) : (
											<ChevronRight
												size={20}
												className="text-ur-gray"
											/>
										)}
										<Smartphone
											size={20}
											className="text-ur-blue-light"
										/>
									</div>
									<div className="min-w-0 flex-1 overflow-hidden">
										<h3 className="font-medium text-ur-white">
											{group.sourceClient.device_name ||
												"Device Group"}
										</h3>
										<p
											className="text-sm text-ur-gray truncate overflow-hidden"
											title={
												group.sourceClient
													.device_spec ||
												"Unknown device"
											}
										>
											{group.sourceClient.device_spec ||
												"Unknown device"}
										</p>
									</div>
								</div>
								<div className="flex items-center gap-3 flex-shrink-0 overflow-hidden">
									<div className="text-right flex-shrink-0">
										<div className="text-sm font-medium text-ur-white">
											{totalClients} client
											{totalClients !== 1 ? "s" : ""}
										</div>
										<div className="text-xs text-ur-gray">
											{connectedCount} connected
										</div>
									</div>
									<div
										className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
											connectedCount > 0
												? "bg-ur-green/10 text-ur-green border border-ur-green"
												: "bg-ur-coral/10 text-ur-coral border border-ur-coral"
										}`}
									>
										{connectedCount > 0
											? "Active"
											: "Offline"}
									</div>
								</div>
							</div>
						</div>

						{/* Expanded Content */}
						{isExpanded && (
							<div className="p-4">
								<div className="space-y-4">
									{/* Source Client */}
									<div>
										<div className="flex items-center gap-2 mb-3">
											<div className="w-2 h-2 bg-ur-blue rounded-full"></div>
											<span className="text-sm font-medium text-ur-blue-light">
												Source Device
											</span>
										</div>
										<ClientCard
											client={group.sourceClient}
											onClientRemoved={onClientRemoved}
											isInGroup={true}
											isConnected={group.childClients.some(client => client.connections && client.connections.length > 0)}
										/>
									</div>

									{/* Child Clients */}
									{group.childClients.length > 0 && (
										<div>
											<div className="flex items-center gap-2 mb-3">
												<div className="w-2 h-2 bg-ur-pink rounded-full"></div>
												<span className="text-sm font-medium text-ur-pink">
													Connected Instances (
													{group.childClients.length})
												</span>
											</div>
											<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pl-4 border-l-2 border-ur-border">
												{group.childClients.map(
													(client) => (
														<ClientCard
															key={
																client.client_id
															}
															client={client}
															onClientRemoved={
																onClientRemoved
															}
															isInGroup={true}
														/>
													),
												)}
											</div>
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				);
			})}

			{/* Standalone Clients */}
			{standaloneClients.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{standaloneClients.map((client) => (
						<ClientCard
							key={client.client_id}
							client={client}
							onClientRemoved={onClientRemoved}
						/>
					))}
				</div>
			)}
		</div>
	);
};

export default ClientsList;
