import React from 'react';

// The letter's subnet-flow exhibit: users, the network operator that serves
// them, and the subnet it buys bandwidth from. Static.
export default function SubnetFlowExhibit() {
    return (
        <figure className="letter-exhibit letter-flow-exhibit">
            <figcaption className="letter-visually-hidden">Users access a Network Operator, which purchases bandwidth from the UR Subnet.</figcaption>
            <div className="letter-flow">
                <section className="letter-flow__stage">
                    <strong>Users</strong>
                    <span>use the app</span>
                </section>
                <span className="letter-flow__arrow" aria-hidden="true">→</span>
                <section className="letter-flow__stage">
                    <strong>Network operator</strong>
                    <span>e.g. ur.io</span>
                    <small>billed in alpha for bandwidth used</small>
                </section>
                <span className="letter-flow__arrow" aria-hidden="true">→</span>
                <section className="letter-flow__stage letter-flow__stage--core">
                    <strong>UR Subnet</strong>
                    <span><b>Top miners</b> ~200, each with its own UID</span>
                    <span><b>Long tail</b> ~100k, earning through pools</span>
                    <small>miners are the residential IP providers</small>
                </section>
            </div>
        </figure>
    );
}
