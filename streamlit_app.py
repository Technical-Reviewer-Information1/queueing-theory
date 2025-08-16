import streamlit as st
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import time
import random

st.set_page_config(page_title="待ち行列シミュレーター", layout="wide")

st.title("待ち行列シミュレーター")
st.caption("Created by Dit-Lab.(Daiki ITO)")
st.caption("Supported by Tomoaki ATSUMI")

st.markdown("---")

st.markdown("""
## 🎯 アプリの概要
このアプリでは、待ち行列理論を体験的に学ぶことができます。
パラメータを調整してシミュレーションを実行し、結果をリアルタイムで確認できます。
""")

st.markdown("### 📊 パラメータ設定")

col1, col2 = st.columns(2)

with col1:
    st.subheader("基本パラメータ")
    arrival_rate = st.slider("到着間隔（分）", min_value=0.5, max_value=5.0, value=1.0, step=0.1)
    service_time = st.slider("サービス時間（分）", min_value=0.5, max_value=5.0, value=1.5, step=0.1)
    
with col2:
    st.subheader("シミュレーション設定")
    num_customers = st.number_input("シミュレーションする顧客数", min_value=5, max_value=50, value=20)
    num_servers = st.selectbox("サーバー数", options=[1, 2, 3], index=0)
    show_realtime = st.checkbox("リアルタイム表示", value=False, help="シミュレーションの進行を段階的に表示します")

start_simulation = st.button("🚀 シミュレーション開始", type="primary")

class Customer:
    def __init__(self, customer_id, arrival_time):
        self.id = customer_id
        self.arrival_time = arrival_time
        self.service_start_time = None
        self.service_end_time = None
        self.wait_time = 0
        
    def calculate_wait_time(self):
        if self.service_start_time:
            self.wait_time = self.service_start_time - self.arrival_time
        return self.wait_time

class Server:
    def __init__(self, server_id):
        self.id = server_id
        self.available_time = 0
        self.customers_served = []
        
    def serve_customer(self, customer, service_time):
        customer.service_start_time = max(customer.arrival_time, self.available_time)
        customer.service_end_time = customer.service_start_time + service_time
        customer.calculate_wait_time()
        
        self.available_time = customer.service_end_time
        self.customers_served.append(customer)

def generate_customers(num_customers, arrival_rate):
    customers = []
    current_time = 0
    
    for i in range(num_customers):
        inter_arrival = np.random.exponential(arrival_rate)
        current_time += inter_arrival
        customers.append(Customer(i+1, current_time))
    
    return customers

def simulate_queue(customers, num_servers, service_time_mean):
    servers = [Server(i+1) for i in range(num_servers)]
    
    for customer in customers:
        available_server = min(servers, key=lambda s: s.available_time)
        service_time = np.random.exponential(service_time_mean)
        available_server.serve_customer(customer, service_time)
    
    return customers, servers

def create_gantt_chart(customers):
    fig = go.Figure()
    
    colors = ['lightblue', 'lightcoral', 'lightgreen', 'lightyellow', 'lightpink']
    
    for i, customer in enumerate(customers):
        if customer.service_start_time and customer.service_end_time:
            arrival_time = customer.arrival_time
            wait_start = arrival_time
            wait_end = customer.service_start_time
            service_start = customer.service_start_time
            service_end = customer.service_end_time
            
            color_idx = (customer.id - 1) % len(colors)
            
            if wait_end > wait_start:
                fig.add_trace(go.Bar(
                    x=[wait_end - wait_start],
                    y=[f'{customer.id}人目'],
                    orientation='h',
                    name='待ち時間',
                    marker_color='lightgray',
                    text=f'待ち: {wait_end - wait_start:.1f}分',
                    textposition='inside',
                    base=wait_start,
                    showlegend=(i == 0),
                    legendgroup='wait'
                ))
            
            fig.add_trace(go.Bar(
                x=[service_end - service_start],
                y=[f'{customer.id}人目'],
                orientation='h',
                name='サービス時間',
                marker_color=colors[color_idx],
                text=f'サービス: {service_end - service_start:.1f}分',
                textposition='inside',
                base=service_start,
                showlegend=(i == 0),
                legendgroup='service'
            ))
    
    fig.update_layout(
        title='待ち行列シミュレーション結果（ガントチャート）',
        xaxis_title='時間（分）',
        yaxis_title='顧客',
        barmode='overlay',
        height=max(400, len(customers) * 30),
        font=dict(size=10),
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=1.02,
            xanchor="right",
            x=1
        ),
        yaxis=dict(autorange="reversed")
    )
    
    return fig

def calculate_statistics(customers):
    wait_times = [customer.wait_time for customer in customers if customer.wait_time is not None]
    service_times = [(customer.service_end_time - customer.service_start_time) 
                    for customer in customers if customer.service_start_time and customer.service_end_time]
    
    stats = {
        'total_customers': len(customers),
        'avg_wait_time': np.mean(wait_times) if wait_times else 0,
        'max_wait_time': np.max(wait_times) if wait_times else 0,
        'avg_service_time': np.mean(service_times) if service_times else 0,
        'total_simulation_time': max([customer.service_end_time for customer in customers if customer.service_end_time])
    }
    
    return stats

def create_realtime_visualization(current_time, queue, servers, served_customers):
    fig = go.Figure()
    
    y_positions = []
    labels = []
    colors = []
    
    for i, customer in enumerate(queue):
        y_positions.append(f"待機中")
        labels.append(f"顧客{customer.id}")
        colors.append("orange")
    
    for i, server in enumerate(servers):
        server_label = f"サーバー{server.id}"
        if server.available_time > current_time:
            current_customer = None
            for customer in served_customers:
                if (customer.service_start_time <= current_time < customer.service_end_time and
                    customer in server.customers_served):
                    current_customer = customer
                    break
            
            if current_customer:
                y_positions.append(server_label)
                labels.append(f"顧客{current_customer.id}")
                colors.append("lightblue")
            else:
                y_positions.append(server_label)
                labels.append("利用可能")
                colors.append("lightgreen")
        else:
            y_positions.append(server_label)
            labels.append("利用可能")
            colors.append("lightgreen")
    
    if y_positions:
        fig.add_trace(go.Bar(
            y=y_positions,
            x=[1] * len(y_positions),
            orientation='h',
            text=labels,
            textposition='inside',
            marker_color=colors,
            showlegend=False
        ))
    
    fig.update_layout(
        title=f"リアルタイム待ち行列状況 (時刻: {current_time:.1f}分)",
        xaxis_title="",
        yaxis_title="",
        height=300,
        xaxis=dict(showticklabels=False, showgrid=False),
        margin=dict(l=100, r=50, t=50, b=50)
    )
    
    return fig

def simulate_queue_realtime(customers, num_servers, service_time_mean, realtime_placeholder):
    servers = [Server(i+1) for i in range(num_servers)]
    queue = []
    served_customers = []
    current_time = 0
    
    event_times = []
    for customer in customers:
        event_times.append(('arrival', customer.arrival_time, customer))
    
    for server in servers:
        event_times.append(('service_complete', 0, server))
    
    event_times.sort(key=lambda x: x[1])
    
    for event_type, event_time, entity in event_times:
        current_time = event_time
        
        if event_type == 'arrival':
            customer = entity
            queue.append(customer)
            
            available_server = None
            for server in servers:
                if server.available_time <= current_time:
                    available_server = server
                    break
            
            if available_server and queue:
                customer = queue.pop(0)
                service_time = np.random.exponential(service_time_mean)
                available_server.serve_customer(customer, service_time)
                served_customers.append(customer)
                
                event_times.append(('service_complete', customer.service_end_time, available_server))
                event_times.sort(key=lambda x: x[1])
        
        elif event_type == 'service_complete' and event_time > 0:
            server = entity
            
            if queue:
                customer = queue.pop(0)
                service_time = np.random.exponential(service_time_mean)
                server.serve_customer(customer, service_time)
                served_customers.append(customer)
                
                event_times.append(('service_complete', customer.service_end_time, server))
                event_times.sort(key=lambda x: x[1])
        
        if realtime_placeholder:
            fig = create_realtime_visualization(current_time, queue, servers, served_customers)
            realtime_placeholder.plotly_chart(fig, use_container_width=True)
            time.sleep(0.5)
    
    return served_customers, servers

if start_simulation:
    customers = generate_customers(num_customers, arrival_rate)
    
    if show_realtime:
        st.subheader("🎬 リアルタイムシミュレーション")
        realtime_placeholder = st.empty()
        
        with st.spinner('リアルタイムシミュレーション実行中...'):
            customers, servers = simulate_queue_realtime(customers, num_servers, service_time, realtime_placeholder)
    else:
        with st.spinner('シミュレーション実行中...'):
            customers, servers = simulate_queue(customers, num_servers, service_time)
    
    st.success('シミュレーション完了！')
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.subheader("📊 シミュレーション結果")
        gantt_fig = create_gantt_chart(customers)
        st.plotly_chart(gantt_fig, use_container_width=True)
        
        if show_realtime:
            st.info("💡 リアルタイム表示では、実際の待ち行列の動きを観察できました！")
    
    with col2:
        st.subheader("📈 統計情報")
        stats = calculate_statistics(customers)
        
        utilization = arrival_rate / service_time
        
        st.metric("総顧客数", f"{stats['total_customers']}人")
        st.metric("平均待ち時間", f"{stats['avg_wait_time']:.2f}分")
        st.metric("最大待ち時間", f"{stats['max_wait_time']:.2f}分")
        st.metric("平均サービス時間", f"{stats['avg_service_time']:.2f}分")
        st.metric("総シミュレーション時間", f"{stats['total_simulation_time']:.2f}分")
        st.metric("利用率 (ρ)", f"{utilization:.2f}", help="ρ = λ/μ")
        
        if utilization >= 1.0:
            st.warning("⚠️ 利用率が1.0以上です。システムが不安定になる可能性があります。")
        elif utilization >= 0.8:
            st.warning("⚠️ 利用率が高めです。待ち時間が長くなる可能性があります。")
        else:
            st.success("✅ 安定したシステム状態です。")

st.markdown("---")

st.markdown("## 📚 待ち行列理論について")

col1, col2 = st.columns(2)

with col1:
    st.markdown("""
    ### 🔍 基本概念
    
    **待ち行列理論**は、サービスを受けるために待機する顧客の行列を数学的に解析する理論です。
    
    #### 主要なパラメータ：
    - **到着間隔（λ）**: 顧客が到着する間隔の平均
    - **サービス時間（μ）**: 1人当たりのサービスにかかる時間
    - **待ち時間**: 顧客が実際にサービスを受けるまでの時間
    - **系内時間**: 到着からサービス完了までの総時間
    
    #### 利用率（ρ）：
    **ρ = λ / μ**
    
    - ρ < 1: 安定した待ち行列
    - ρ ≥ 1: 待ち行列が無限に増大する可能性
    """)

with col2:
    st.markdown("""
    ### 🏪 実際の応用例
    
    待ち行列理論は様々な場面で活用されています：
    
    #### 銀行・ATM
    - 窓口数の最適化
    - 待ち時間の予測
    
    #### コールセンター
    - オペレーター数の決定
    - 応答時間の改善
    
    #### レストラン・店舗
    - 混雑時の人員配置
    - 顧客満足度の向上
    
    #### コンピュータシステム
    - サーバー負荷分散
    - ネットワーク最適化
    """)

st.markdown("""
### 🎲 このシミュレーターの特徴

1. **指数分布**: 到着間隔とサービス時間に指数分布を使用
2. **M/M/c モデル**: マルコフ到着過程 / マルコフサービス過程 / c個のサーバー
3. **FIFO**: 先入先出（First In, First Out）の待ち行列規律

### 💡 実験してみよう！

- **到着間隔**を短くすると（より頻繁に顧客が到着）→ 待ち時間が増加
- **サービス時間**を長くすると → 待ち時間が増加  
- **サーバー数**を増やすと → 待ち時間が減少

パラメータを変更して、システムの性能がどう変化するかを観察してみてください！
""")

st.markdown("---")
