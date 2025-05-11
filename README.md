# 🗽 NYC Congestion Pricing Dashboard

An interactive web dashboard that visualizes vehicle entries into New York City’s Congestion Relief Zone (CRZ), alongside real-time air quality metrics. This project explores how congestion pricing may be affecting urban mobility and environmental conditions during the program's first three months (January 5 – April 5, 2025).

## 🚦 What It Shows

- **Mapbox-powered visualization** of CRZ entry points by vehicle detection group
- **Date slider and input box** to explore daily vehicle volumes and AQI trends
- **Interactive popups** with dynamic pie charts showing vehicle class composition at each entry point
- **Color-coded AQI meters** for PM2.5, NO₂, and O₃ based on U.S. EPA standards
- **CRZ boundary overlay** using GeoJSON parsed from WKT
- **Dashboard controls** with a collapsible sidebar, date selection, and AQI legend toggle

## 📊 Data Sources

- **Vehicle Entry Data**: MTA Metrics API (aggregated daily entries and composition)
- **Air Quality Data**: AQICN API (PM2.5, NO₂, O₃)
- Data updated through April 5, 2025

## 🛠 Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **Mapping**: Mapbox GL JS
- **Charts**: Chart.js
- **Data Preprocessing**: Python (Pandas, Seaborn, Matplotlib)
- **Deployment**: GitHub Pages

## 🧪 Development Features

- Live-linked data visualizations with data-driven styling
- Future support for pre-policy comparison and statistical modeling (e.g., DiD)

## 📁 Folder Structure

```
├── css/                  # Custom stylesheets
├── data/                 # Cleaned JSON datasets & Jupyter notebooks for data cleaning
├── js/                   # JavaScript logic and map setup
├── index.html            # Main HTML structure
└── README.md             # Project overview (this file)
```

## 🌐 Live Demo

📍 [View Dashboard on GitHub Pages](https://tonybzzhao.github.io/crz-dashboard)

## 📝 Credits

Created by Tony Zhao | NYU Wagner | Interactive GIS (Spring 2025)