from flask import Flask, render_template, request, jsonify, Response
import requests
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import random
import os
import socket
import ssl
import urllib3
from urllib.parse import urlparse
import dns.resolver
import subprocess
import re
import json

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Global variables for progress tracking
scan_progress = {
    'total': 0,
    'scanned': 0,
    'found': 0,
    'results': []
}

# Track found subdomains to prevent duplicates
found_subdomains = set()

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
]

def load_wordlist():
    """Load the subdomain wordlist and remove duplicates"""
    try:
        with open('subdomain.txt', 'r') as f:
            # Use set to automatically remove duplicates, then convert back to sorted list
            wordlist = sorted(list(set(line.strip().lower() for line in f.readlines() if line.strip())))
        print(f"Loaded {len(wordlist)} unique subdomains from wordlist")
        return wordlist
    except FileNotFoundError:
        print("Wordlist file not found")
        return ['www', 'mail', 'ftp', 'admin', 'test', 'dev', 'api', 'blog', 'shop', 'forum']

def check_subdomain(subdomain, domain, timeout=8):
    """Check if subdomain exists and is accessible"""
    full_domain = f"{subdomain}.{domain}"
    
    # Skip if we've already found this subdomain
    if full_domain.lower() in found_subdomains:
        return None
    
    # First check DNS resolution
    try:
        socket.gethostbyname(full_domain)
    except socket.gaierror:
        return None
    
    # Try HTTP/HTTPS
    for protocol in ['https', 'http']:
        url = f"{protocol}://{full_domain}"
        try:
            headers = {'User-Agent': random.choice(USER_AGENTS)}
            response = requests.get(url, headers=headers, timeout=timeout, verify=False, allow_redirects=True)
            
            if response.status_code in [200, 301, 302, 403, 401, 500]:
                # Add to found set to prevent duplicates
                found_subdomains.add(full_domain.lower())
                
                title = extract_title(response.text)
                return {
                    'subdomain': full_domain,
                    'url': url,
                    'status_code': response.status_code,
                    'content_length': len(response.content),
                    'title': title,
                    'server': response.headers.get('Server', 'Unknown'),
                    'content_type': response.headers.get('Content-Type', 'Unknown'),
                    'response_time': response.elapsed.total_seconds(),
                    'final_url': response.url
                }
        except requests.exceptions.RequestException:
            continue
    
    return None

def extract_title(html_content):
    """Extract title from HTML content"""
    try:
        import re
        title_match = re.search(r'<title[^>]*>([^<]+)</title>', html_content, re.IGNORECASE)
        if title_match:
            return title_match.group(1).strip()
    except:
        pass
    return "No Title"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scan', methods=['POST'])
def scan_subdomains():
    """Main scanning endpoint with streaming response"""
    global scan_progress, found_subdomains
    
    data = request.get_json()
    domain = data.get('domain', '').strip()
    threads = data.get('threads', 100)
    timeout = data.get('timeout', 8)
    
    if not domain:
        return jsonify({'error': 'Domain is required'}), 400
    
    # Reset progress and found subdomains
    scan_progress = {'total': 0, 'scanned': 0, 'found': 0, 'results': []}
    found_subdomains = set()  # Clear previous scan results
    
    def generate():
        wordlist = load_wordlist()
        scan_progress['total'] = len(wordlist)
        
        # Send initial progress
        yield f"data: {json.dumps({'type': 'progress', 'total': len(wordlist), 'scanned': 0, 'found': 0})}\n\n"
        
        found_results = []
        
        def scan_worker(subdomain):
            result = check_subdomain(subdomain, domain, timeout)
            scan_progress['scanned'] += 1
            
            if result:
                scan_progress['found'] += 1
                found_results.append(result)
                # Send real-time result
                return f"data: {json.dumps({'type': 'result', **result})}\n\n"
            
            # Send progress update every 10 scans
            if scan_progress['scanned'] % 10 == 0:
                return f"data: {json.dumps({'type': 'progress', 'total': scan_progress['total'], 'scanned': scan_progress['scanned'], 'found': scan_progress['found']})}\n\n"
            
            return None
        
        # Use ThreadPoolExecutor for concurrent scanning
        with ThreadPoolExecutor(max_workers=threads) as executor:
            future_to_subdomain = {executor.submit(scan_worker, sub): sub for sub in wordlist}
            
            for future in as_completed(future_to_subdomain):
                result = future.result()
                if result:
                    yield result
        
        # Send final results
        final_data = {
            'type': 'complete',
            'subdomains': found_results,
            'wordlist_size': len(wordlist),
            'total_checked': scan_progress['scanned'],
            'found_count': scan_progress['found']
        }
        yield f"data: {json.dumps(final_data)}\n\n"
    
    return Response(generate(), mimetype='text/plain')

if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
