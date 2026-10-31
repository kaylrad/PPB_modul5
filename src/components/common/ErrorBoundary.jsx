import { Component } from 'react'
export default class ErrorBoundary extends Component {
 state={error:false}
 static getDerivedStateFromError(){return {error:true}}
 render(){return this.state.error?<div role="alert"><h1>Halaman gagal dimuat</h1><p>Periksa koneksi lalu muat ulang aplikasi.</p><button onClick={()=>window.location.reload()}>Muat ulang</button></div>:this.props.children}
}
