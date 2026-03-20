import os
from flask import Flask, render_template, request, redirect, session, url_for
import sqlite3
import requests
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
app.secret_key = "SainandhuSecret123"  # Session key

API_KEY = "47ffa6ecca1f3ecfcf9e5af41a6069e0"  # Replace with your key

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
db_path = os.path.join(BASE_DIR, "database.db")

# ------------------- Login Page -------------------
@app.route('/', methods=['GET','POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute('SELECT password FROM users WHERE username=?', (username,))
        data = c.fetchone()
        conn.close()

        if data and check_password_hash(data[0], password):
            session['user'] = username
            return redirect('/dashboard')
        else:
            error = "Invalid username or password"
            return render_template('login.html', error=error)
    return render_template('login.html')

# ------------------- Signup Page -------------------
@app.route('/signup', methods=['GET','POST'])
def signup():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = generate_password_hash(request.form['password'])

        conn = sqlite3.connect(db_path)
        c = conn.cursor()
        c.execute('INSERT INTO users (username,email,password) VALUES (?,?,?)', (username,email,password))
        conn.commit()
        conn.close()

        return redirect('/')
    return render_template('signup.html')

# ------------------- Dashboard -------------------
@app.route('/dashboard', methods=['GET', 'POST'])
def dashboard():
    if 'user' not in session:
        return redirect('/')

    weather = None
    message = None

    
    if request.method == 'POST':
        city = request.form.get('city')
        print("City entered:", city)
        url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
        res = requests.get(url).json()
        print("API response:", res)

        if res.get('main'):
            weather = {
                'city': city,
                'temp': res['main']['temp'],
                'description': res['weather'][0]['description']
            }
        else:
            message = "City not found. Try again."

    return render_template('dashboard.html', weather=weather, message=message, user=session['user'])

# ------------------- Logout -------------------
@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/')

if __name__ == '__main__':
    app.run(debug=True)
