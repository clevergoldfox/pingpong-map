"use client"

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts"

export default function RatingGraph({ data }: { data: any[] }) {
    if (!data || data.length === 0) {
        return (
            <div style={{ height: 200 }}>
                まだレーティング履歴がありません
            </div>
        )
    }
    return (
        <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <XAxis
                        dataKey="createdAt"
                        tickFormatter={(v) =>
                            new Date(v).toLocaleDateString()
                        }
                    />
                    <YAxis />
                    <Tooltip />
                    <Line
                        type="monotone"
                        dataKey="newRating"
                        stroke="#2563eb"
                        strokeWidth={2}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}