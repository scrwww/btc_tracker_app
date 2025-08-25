import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonCard,
  IonCardContent,
  IonInput,
} from '@ionic/angular/standalone';

import {
  Chart,
  TimeScale,
  LinearScale,
  Tooltip,
  Legend,
  CategoryScale,
} from 'chart.js';
import 'chartjs-chart-financial';
import 'chartjs-adapter-date-fns';
import type { ChartConfiguration } from 'chart.js';
import type { FinancialDataPoint } from 'chart.js';
import {
  CandlestickController,
  CandlestickElement,
} from 'chartjs-chart-financial';

@Component({
  selector: 'app-tracker',
  templateUrl: './tracker.page.html',
  styleUrls: ['./tracker.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    CommonModule,
    FormsModule,
    IonButton,
    IonCard,
    IonCardContent,
    IonInput,
  ],
})
export class TrackerPage implements OnInit {
  saldo: number = 10000;
  position: number = 0;
  estadoPosicao = false;

  constructor() {}

  ngOnInit() {
    renderChart().then(() => {
      setInterval(updateChart, 3000);
      console.log('Auto-update started (60s interval)');
    });
  }

  comprar() {
    const v = document.querySelector('#btn_vender');
    v?.setAttribute('disabled', 'false');
    const c = document.querySelector('#btn_comprar');
    c?.setAttribute('disabled', 'true');
  }

  getMax() {}

  vender() {
    const c = document.querySelector('#btn_comprar');
    c?.setAttribute('disabled', 'false');
    const v = document.querySelector('#btn_vender');
    v?.setAttribute('disabled', 'true');
  }
}

interface RawApiResponse {
  t: number[]; // timestamps
  o: string[]; // open
  h: string[]; // high
  l: string[]; // low
  c: string[]; // close
  v: string[]; // volume
}

Chart.register(
  TimeScale,
  LinearScale,
  CategoryScale,
  CandlestickController,
  CandlestickElement,
  Tooltip,
  Legend
);

function transformApiData(raw: RawApiResponse): FinancialDataPoint[] {
  return raw.t.map((timestamp, i) => ({
    x: timestamp * 1000, // this is so dumb... s to ms
    o: parseFloat(raw.o[i] ?? '0'),
    h: parseFloat(raw.h[i] ?? '0'),
    l: parseFloat(raw.l[i] ?? '0'),
    c: parseFloat(raw.c[i] ?? '0'),
  }));
}

async function fetchCandles(): Promise<FinancialDataPoint[]> {
  const timestamp = Date.now();
  const response = await fetch(
    `https://api.mercadobitcoin.net/api/v4/candles?symbol=BTC-BRL&resolution=1m&to=${timestamp}&countback=100`
  );
  console.log(response);
  const raw: RawApiResponse = await response.json();
  console.log(response);
  return transformApiData(raw);
}

async function fetchLatestCandle(): Promise<FinancialDataPoint[]> {
  const timestamp = Date.now();
  const response = await fetch(
    `https://api.mercadobitcoin.net/api/v4/candles?symbol=BTC-BRL&resolution=1m&to=${timestamp}&countback=1`
  );
  console.log(response);
  const raw: RawApiResponse = await response.json();
  console.log(response);
  return transformApiData(raw);
}

let chart: Chart<'candlestick'> | null = null;

async function renderChart() {
  const ctx = document.getElementById('candlestick') as HTMLCanvasElement;
  const candles = await fetchCandles();

  const config: ChartConfiguration<'candlestick'> = {
    type: 'candlestick',
    data: {
      datasets: [
        {
          label: 'Preço',
          data: candles,
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: 'time',
          time: { unit: 'minute' },
        },
      },
    },
  };

  chart = new Chart(ctx, config) as any;
}

async function updateChart() {
  if (!chart) return;

  try {
    const latestCandles = await fetchLatestCandle();
    const latest = latestCandles[0];
    const dataset = chart.data.datasets[0];

    if (!latest || !dataset || !Array.isArray(dataset.data)) return;

    const data = dataset.data as FinancialDataPoint[];
    const last = data[data.length - 1];

    if (last && latest.x === last.x) {
      data[data.length - 1] = latest;
    } else if (last && latest.x > last.x) {
      data.push(latest);
      if (data.length > 100) data.shift();
    }

    chart.update('none');
    console.log(`Chart updat ${new Date().toLocaleTimeString()}`);
  } catch (error) {
    console.error('Error :', error);
  }
}
